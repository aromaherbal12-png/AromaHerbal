import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import GoodsReceipt, { GOODS_RECEIPT_STATUS } from "../inventory/models/GoodsReceipt.js";
import StockTransaction, { STOCK_TRANSACTION_TYPE } from "../inventory/models/StockTransaction.js";
import MaterialQC, { MATERIAL_QC_STATUS } from "./models/MaterialQC.js";
import ProductionBatch, { PRODUCTION_BATCH_STATUS } from "../production/models/ProductionBatch.js";
import BMR, { BMR_STATUS } from "../production/models/BMR.js";
import ProductionQC, { PRODUCTION_QC_STATUS } from "./models/ProductionQC.js";
import FinishedGoods, { FINISHED_GOODS_STATUS } from "../finished-goods/models/FinishedGoods.js";
import ProductionPlan from "../production/models/ProductionPlan.js";

function makeQCNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `MQC-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function makeTransactionNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `STK-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createMaterialQC(data, actorId) {
  const session = await mongoose.startSession();
  try {
    let createdQC;
    await session.withTransaction(async () => {
      const receipt = await GoodsReceipt.findById(data.goodsReceiptId).session(session);
      if (!receipt) throw new ApiError(404, "Goods Receipt Note not found.");
      const receiptItem = receipt.items.id(data.goodsReceiptItemId);
      if (!receiptItem) throw new ApiError(404, "GRN item not found.");
      const existingQC = await MaterialQC.findOne({ goodsReceipt: receipt._id, goodsReceiptItemId: receiptItem._id }).session(session);
      if (existingQC) throw new ApiError(409, "This GRN item has already been inspected.");
      if (receiptItem.qualityStatus !== "Pending Inspection") throw new ApiError(409, "This GRN item is not awaiting inspection.");
      if (data.inspectedQty > receiptItem.receivedQty) throw new ApiError(400, "Inspected quantity cannot exceed the received quantity.");
      const { acceptedQty, rejectedQty } = data;
      if (Math.abs(data.inspectedQty - acceptedQty - rejectedQty) > 1e-9) throw new ApiError(400, "Inspected quantity must equal accepted quantity plus rejected quantity.");
      const remainingQty = Number(receiptItem.receivedQty) - data.inspectedQty;
      let status;
      if (acceptedQty > 0 && rejectedQty === 0 && remainingQty === 0) status = MATERIAL_QC_STATUS.ACCEPTED;
      else if (acceptedQty > 0) status = MATERIAL_QC_STATUS.PARTIALLY_ACCEPTED;
      else status = MATERIAL_QC_STATUS.REJECTED;
      const [qc] = await MaterialQC.create([{ qcNumber: makeQCNumber(), goodsReceipt: receipt._id, grnNumber: receipt.grnNumber, goodsReceiptItemId: receiptItem._id, material: receiptItem.material, materialCode: receiptItem.materialCode, materialName: receiptItem.materialName, batchNumber: receiptItem.batchNumber || "", receivedQty: receiptItem.receivedQty, inspectedQty: data.inspectedQty, acceptedQty, rejectedQty, status, testResults: data.testResults || {}, remarks: data.remarks || "", inspectedBy: actorId, inspectedAt: new Date() }], { session });
      const transactions = [];
      if (acceptedQty > 0) transactions.push({ transactionNumber: makeTransactionNumber(), material: receiptItem.material, materialCode: receiptItem.materialCode, materialName: receiptItem.materialName, transactionType: STOCK_TRANSACTION_TYPE.QC_ACCEPTANCE, quantity: acceptedQty, unit: receiptItem.unit, goodsReceipt: receipt._id, goodsReceiptItemId: receiptItem._id, materialQC: qc._id, batchNumber: receiptItem.batchNumber || "", stockBucket: "Usable", remarks: `Accepted through QC ${qc.qcNumber}`, performedBy: actorId });
      if (rejectedQty > 0) transactions.push({ transactionNumber: makeTransactionNumber(), material: receiptItem.material, materialCode: receiptItem.materialCode, materialName: receiptItem.materialName, transactionType: STOCK_TRANSACTION_TYPE.QC_REJECTION, quantity: rejectedQty, unit: receiptItem.unit, goodsReceipt: receipt._id, goodsReceiptItemId: receiptItem._id, materialQC: qc._id, batchNumber: receiptItem.batchNumber || "", stockBucket: "Rejected", remarks: `Rejected through QC ${qc.qcNumber}`, performedBy: actorId });
      if (transactions.length) await StockTransaction.insertMany(transactions, { session });
      receiptItem.qualityStatus = remainingQty > 0 ? "Pending Inspection" : acceptedQty > 0 && rejectedQty > 0 ? "Partially Accepted" : acceptedQty > 0 ? "Accepted" : "Rejected";
      const allInspected = receipt.items.every((item) => item.qualityStatus !== "Pending Inspection");
      receipt.status = allInspected ? GOODS_RECEIPT_STATUS.QC_COMPLETED : GOODS_RECEIPT_STATUS.QC_PENDING;
      await receipt.save({ session });
      createdQC = qc;
    });
    return await MaterialQC.findById(createdQC._id).populate("goodsReceipt", "grnNumber status").populate("material", "materialCode name unit").populate("inspectedBy", "name email role").lean();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(500, `Failed to create material QC: ${error.message}`);
  } finally {
    await session.endSession();
  }
}

export async function listMaterialQC(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.goodsReceiptId) filter.goodsReceipt = query.goodsReceiptId;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ qcNumber: search }, { grnNumber: search }, { materialCode: search }, { materialName: search }, { batchNumber: search }];
  }
  const page = query.page || 1; const limit = query.limit || 20;
  const [items, total] = await Promise.all([
    MaterialQC.find(filter).populate("goodsReceipt", "grnNumber status").populate("material", "materialCode name unit").populate("inspectedBy", "name email role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MaterialQC.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getMaterialQC(id) {
  const qc = await MaterialQC.findById(id).populate("goodsReceipt", "grnNumber status").populate("material", "materialCode name unit").populate("inspectedBy", "name email role").lean();
  if (!qc) throw new ApiError(404, "Material QC record not found.");
  return qc;
}

export async function createProductionQC(data, actorId) {
  const session = await mongoose.startSession();
  try {
    let createdQCId;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(data.productionBatchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (batch.status !== "Pending Review") throw new ApiError(400, "Production QC requires a batch pending review");
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(404, "BMR not found for this production batch");
      if (bmr.status !== BMR_STATUS.PENDING_REVIEW) throw new ApiError(400, "The BMR must be pending review before production QC");
      if (!Number.isFinite(data.sampleQuantity) || data.sampleQuantity <= 0) throw new ApiError(400, "Sample quantity must be greater than zero");
      if (data.sampleQuantity > batch.actualOutputQuantity) throw new ApiError(400, "Sample quantity cannot exceed the recorded production output");
      if (!Array.isArray(data.tests) || data.tests.length === 0) throw new ApiError(400, "At least one quality test is required");
      const tests = data.tests.map((test) => ({ testName: test.testName, specification: test.specification ?? "", actualResult: test.actualResult, unit: test.unit ?? "", result: test.result, remarks: test.remarks ?? "" }));
      const [qc] = await ProductionQC.create([{ inspectionNumber: `PQC-${randomUUID()}`, productionBatch: batch._id, bmr: bmr._id, productCode: batch.productCode, productName: batch.productName, batchNumber: batch.batchNumber, sampleQuantity: data.sampleQuantity, sampleUnit: data.sampleUnit, tests, status: PRODUCTION_QC_STATUS.PENDING, decisionRemarks: data.decisionRemarks ?? "", inspectedBy: actorId, inspectedAt: new Date(), createdBy: actorId, updatedBy: actorId }], { session });
      createdQCId = qc._id;
    });
    return ProductionQC.findById(createdQCId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("inspectedBy", "name email");
  } finally { await session.endSession(); }
}

export async function listProductionQC(filters = {}) {
  const query = {};
  if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
  if (filters.status) query.status = filters.status;
  return ProductionQC.find(query).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("inspectedBy", "name email").populate("reviewedBy", "name email").sort({ createdAt: -1 });
}

export async function getProductionQC(qcId) {
  const qc = await ProductionQC.findById(qcId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("inspectedBy", "name email").populate("reviewedBy", "name email");
  if (!qc) throw new ApiError(404, "Production QC inspection not found");
  return qc;
}

export async function decideProductionQC(qcId, data, actorId) {
  const session = await mongoose.startSession();
  try {
    let updatedQCId;
    await session.withTransaction(async () => {
      const qc = await ProductionQC.findById(qcId).session(session);
      if (!qc) throw new ApiError(404, "Production QC inspection not found");
      if (qc.status !== PRODUCTION_QC_STATUS.PENDING) throw new ApiError(400, "Only a pending production QC inspection can receive a decision");
      const batch = await ProductionBatch.findById(qc.productionBatch).session(session);
      if (!batch || batch.status !== "Pending Review") throw new ApiError(409, "The associated batch must remain pending review");
      const bmr = await BMR.findById(qc.bmr).session(session);
      if (!bmr || bmr.status !== BMR_STATUS.PENDING_REVIEW) throw new ApiError(409, "The associated BMR must remain pending review");
      if (!["Accepted", "Rejected", "On Hold"].includes(data.decision)) throw new ApiError(400, "Invalid production QC decision");
      if (data.decision !== "Accepted" && !data.decisionRemarks?.trim()) throw new ApiError(400, "Remarks are required for rejection or hold decisions");
      if (data.decision === "Accepted" && qc.tests.some((test) => test.result === "Fail")) throw new ApiError(400, "QC cannot be accepted while any test has failed");
      qc.status = data.decision; qc.decisionRemarks = data.decisionRemarks?.trim() ?? ""; qc.reviewedBy = actorId; qc.reviewedAt = new Date(); qc.updatedBy = actorId;
      await qc.save({ session });
      updatedQCId = qc._id;

      // ── When QC is accepted, finalize the batch/BMR and auto-create finished goods ──
      if (data.decision === "Accepted") {
        // Move batch to COMPLETED
        batch.status = PRODUCTION_BATCH_STATUS.COMPLETED;
        batch.actualEndDate = new Date();
        batch.completedBy = actorId;
        batch.updatedBy = actorId;
        await batch.save({ session });

        // Move BMR to COMPLETED
        bmr.status = BMR_STATUS.COMPLETED;
        bmr.updatedBy = actorId;
        await bmr.save({ session });

        // Move production plan to COMPLETED
        const plan = await ProductionPlan.findById(batch.productionPlan).session(session);
        if (plan) {
          plan.status = "Completed";
          plan.updatedBy = actorId;
          await plan.save({ session });
        }

        // Auto-create + auto-release finished goods lot (if not already created)
        const existingLot = await FinishedGoods.findOne({ productionBatch: batch._id }).session(session);
        if (!existingLot) {
          const usableQuantity = batch.actualOutputQuantity - batch.rejectedOutputQuantity;
          if (usableQuantity > 0) {
            await FinishedGoods.create([{
              lotNumber: `FG-${randomUUID()}`,
              productionBatch: batch._id,
              bmr: bmr._id,
              bmrNumber: bmr.bmrNumber,
              productionQC: qc._id,
              productCode: batch.productCode,
              productName: batch.productName,
              producedQuantity: batch.actualOutputQuantity,
              rejectedQuantity: batch.rejectedOutputQuantity,
              availableQuantity: usableQuantity,
              reservedQuantity: 0,
              dispatchedQuantity: 0,
              unit: batch.outputUnit,
              status: FINISHED_GOODS_STATUS.AVAILABLE,
              releasedAt: new Date(),
              releasedBy: actorId,
              createdBy: actorId,
              updatedBy: actorId,
            }], { session });
          }
        }
      }
    });
    return ProductionQC.findById(updatedQCId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("inspectedBy", "name email").populate("reviewedBy", "name email");
  } finally { await session.endSession(); }
}
