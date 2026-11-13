import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import FinishedGoods, { FINISHED_GOODS_STATUS } from "./models/FinishedGoods.js";
import ProductionBatch from "../production/models/ProductionBatch.js";
import BMR, { BMR_STATUS } from "../production/models/BMR.js";
import ProductionQC, { PRODUCTION_QC_STATUS } from "../quality/models/ProductionQC.js";

export const createFinishedGoodsLot = async (batchId, actorId) => {
  const session = await mongoose.startSession();
  try {
    let createdLotId;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(batchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (batch.status !== "Completed") throw new ApiError(400, "Production must be completed before creating a finished-goods lot");
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(404, "BMR not found for production batch");
      if (bmr.status !== BMR_STATUS.COMPLETED) throw new ApiError(400, "The BMR must be approved and completed before lot creation");
      const qc = await ProductionQC.findOne({ productionBatch: batch._id, bmr: bmr._id, status: PRODUCTION_QC_STATUS.ACCEPTED }).sort({ reviewedAt: -1 }).session(session);
      if (!qc) throw new ApiError(400, "An accepted Production QC inspection is required");
      if (qc.tests.some((test) => test.result === "Fail")) throw new ApiError(400, "A QC inspection containing failed tests cannot release a lot");
      const existingLot = await FinishedGoods.findOne({ productionBatch: batch._id }).session(session);
      if (existingLot) throw new ApiError(409, "A finished-goods lot already exists for this production batch");
      const producedQuantity = batch.actualOutputQuantity;
      const rejectedQuantity = batch.rejectedOutputQuantity;
      if (!Number.isFinite(producedQuantity) || !Number.isFinite(rejectedQuantity) || producedQuantity <= 0 || rejectedQuantity < 0 || rejectedQuantity > producedQuantity) throw new ApiError(400, "Production output quantities are invalid for finished-goods creation");
      const [lot] = await FinishedGoods.create([{ lotNumber: `FG-${randomUUID()}`, productionBatch: batch._id, bmr: bmr._id, productionQC: qc._id, productCode: batch.productCode, productName: batch.productName, producedQuantity, rejectedQuantity, availableQuantity: 0, reservedQuantity: 0, dispatchedQuantity: 0, unit: batch.outputUnit, status: FINISHED_GOODS_STATUS.PENDING_RELEASE, createdBy: actorId, updatedBy: actorId }], { session });
      createdLotId = lot._id;
    });
    return FinishedGoods.findById(createdLotId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("productionQC", "inspectionNumber status");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A finished-goods lot already exists for this batch or lot number");
    throw error;
  } finally { await session.endSession(); }
};

export const listFinishedGoods = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.productCode) query.productCode = filters.productCode;
  return FinishedGoods.find(query).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("productionQC", "inspectionNumber status").sort({ createdAt: -1 });
};

export const getFinishedGoodsLot = async (lotId) => {
  const lot = await FinishedGoods.findById(lotId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("productionQC", "inspectionNumber status").populate("createdBy", "name email").populate("releasedBy", "name email");
  if (!lot) throw new ApiError(404, "Finished-goods lot not found");
  return lot;
};

// ── Create finished goods from BMR (frontend-generated BMR) ────────────────────
// Creates a lot with status "Pending Release" — Quality In-charge releases it after testing.

export const createFinishedGoodsFromBMR = async (data, actorId) => {
  // Prevent duplicates
  if (data.bmrNumber) {
    const existing = await FinishedGoods.findOne({ bmrNumber: data.bmrNumber.trim() });
    if (existing) throw new ApiError(409, "Finished goods have already been created for this BMR");
  }

  const producedQuantity = Number(data.producedQuantity) || 0;
  const rejectedQuantity = Number(data.rejectedQuantity) || 0;

  if (!data.productName?.trim()) throw new ApiError(400, "Product name is required");
  if (producedQuantity <= 0) throw new ApiError(400, "Produced quantity must be greater than zero");
  if (rejectedQuantity < 0 || rejectedQuantity > producedQuantity) throw new ApiError(400, "Rejected quantity is invalid");

  const [lot] = await FinishedGoods.create([{
    lotNumber: `FG-${randomUUID()}`,
    bmrNumber: data.bmrNumber?.trim() || "",
    productCode: data.productCode?.trim() || "",
    productName: data.productName.trim(),
    producedQuantity,
    rejectedQuantity,
    availableQuantity: producedQuantity - rejectedQuantity,
    reservedQuantity: 0,
    dispatchedQuantity: 0,
    unit: data.unit?.trim() || "units",
    status: FINISHED_GOODS_STATUS.AVAILABLE,
    releasedAt: new Date(),
    releasedBy: actorId,
    createdBy: actorId,
    updatedBy: actorId,
  }]);

  return FinishedGoods.findById(lot._id).populate("createdBy", "name email");
};

// ── Release a finished goods lot (QC gate) ────────────────────────────────────
// For lots created from the full production flow, validates QC acceptance.
// For lots created from BMR (no productionQC), simply releases.

export const releaseFinishedGoodsLot = async (lotId, actorId) => {
  const session = await mongoose.startSession();
  try {
    let releasedLotId;
    await session.withTransaction(async () => {
      const lot = await FinishedGoods.findById(lotId).session(session);
      if (!lot) throw new ApiError(404, "Finished-goods lot not found");
      if (lot.status !== FINISHED_GOODS_STATUS.PENDING_RELEASE) throw new ApiError(400, "Only a pending-release lot can be released");

      // If lot was created from the full production flow, validate QC
      if (lot.productionQC) {
        const batch = await ProductionBatch.findById(lot.productionBatch).session(session);
        const bmr = await BMR.findById(lot.bmr).session(session);
        const qc = await ProductionQC.findById(lot.productionQC).session(session);
        if (!batch || batch.status !== "Completed") throw new ApiError(409, "The production batch must be completed before release");
        if (!bmr || bmr.status !== BMR_STATUS.COMPLETED) throw new ApiError(409, "The BMR must be completed before release");
        if (!qc || qc.status !== PRODUCTION_QC_STATUS.ACCEPTED) throw new ApiError(409, "An accepted QC inspection is required for release");
        if (!qc.bmr.equals(bmr._id) || !qc.productionBatch.equals(batch._id)) throw new ApiError(409, "The QC inspection does not match this production batch and BMR");
      }

      const usableQuantity = lot.producedQuantity - lot.rejectedQuantity;
      if (usableQuantity <= 0) throw new ApiError(400, "There is no usable quantity to release");
      lot.availableQuantity = usableQuantity; lot.status = FINISHED_GOODS_STATUS.AVAILABLE; lot.releasedAt = new Date(); lot.releasedBy = actorId; lot.updatedBy = actorId;
      await lot.save({ session });
      releasedLotId = lot._id;
    });
    return FinishedGoods.findById(releasedLotId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("productionQC", "inspectionNumber status").populate("createdBy", "name email").populate("releasedBy", "name email");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A duplicate finished-goods record was detected");
    throw error;
  } finally { await session.endSession(); }
};
