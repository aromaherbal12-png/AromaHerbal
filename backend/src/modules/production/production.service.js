import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import Material from "../inventory/models/Material.js";
import StockTransaction from "../inventory/models/StockTransaction.js";
import ProductionEntry from "./models/ProductionEntry.js";
import ProductionPlan, { PRODUCTION_PLAN_STATUS } from "./models/ProductionPlan.js";
import ProductionBatch, { PRODUCTION_BATCH_STATUS } from "./models/ProductionBatch.js";
import BMR, { BMR_STATUS } from "./models/BMR.js";
import { generateBatchNumber } from "../../utils/generateBatchNumber.js";

function makePlanNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PLAN-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Production Plans ──────────────────────────────────────────────────────────

export async function createProductionPlan(data, actorId) {
  const materialIds = data.materials.map((item) => item.materialId);
  const materials = await Material.find({ _id: { $in: materialIds }, isActive: true }).lean();
  if (materials.length !== materialIds.length) throw new ApiError(400, "One or more selected materials are missing or inactive.");
  const materialMap = new Map(materials.map((m) => [String(m._id), m]));
  const planMaterials = data.materials.map((item) => {
    const material = materialMap.get(item.materialId);
    return { material: material._id, materialCode: material.materialCode, materialName: material.name, unit: material.unit, quantityPerUnit: item.quantityPerUnit, plannedQuantity: Number((item.quantityPerUnit * data.targetQuantity).toFixed(6)) };
  });
  return ProductionPlan.create({ planNumber: makePlanNumber(), productName: data.productName, productCode: data.productCode, targetQuantity: data.targetQuantity, outputUnit: data.outputUnit, plannedStartDate: new Date(data.plannedStartDate), plannedEndDate: new Date(data.plannedEndDate), materials: planMaterials, status: PRODUCTION_PLAN_STATUS.DRAFT, notes: data.notes || "", createdBy: actorId });
}

export async function listProductionPlans(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ planNumber: search }, { productName: search }, { productCode: search }];
  }
  const page = query.page || 1; const limit = query.limit || 20;
  const [items, total] = await Promise.all([
    ProductionPlan.find(filter).populate("createdBy", "name email role").populate("approvedBy", "name email role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ProductionPlan.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getProductionPlan(id) {
  const plan = await ProductionPlan.findById(id).populate("materials.material", "materialCode name unit").populate("createdBy", "name email role").populate("approvedBy", "name email role").lean();
  if (!plan) throw new ApiError(404, "Production Plan not found.");
  return plan;
}

export async function approveProductionPlan(id, actorId) {
  const plan = await ProductionPlan.findOneAndUpdate({ _id: id, status: PRODUCTION_PLAN_STATUS.DRAFT }, { $set: { status: PRODUCTION_PLAN_STATUS.APPROVED, approvedBy: actorId, approvedAt: new Date(), updatedBy: actorId } }, { new: true, runValidators: true });
  if (!plan) {
    const existing = await ProductionPlan.findById(id);
    if (!existing) throw new ApiError(404, "Production Plan not found.");
    throw new ApiError(409, `Only Draft plans can be approved. Current status: ${existing.status}.`);
  }
  return plan;
}

export async function cancelProductionPlan(id, actorId) {
  const plan = await ProductionPlan.findOneAndUpdate({ _id: id, status: { $in: [PRODUCTION_PLAN_STATUS.DRAFT, PRODUCTION_PLAN_STATUS.APPROVED] } }, { $set: { status: PRODUCTION_PLAN_STATUS.CANCELLED, updatedBy: actorId } }, { new: true, runValidators: true });
  if (!plan) {
    const existing = await ProductionPlan.findById(id);
    if (!existing) throw new ApiError(404, "Production Plan not found.");
    throw new ApiError(409, "Only Draft or Approved plans can be cancelled.");
  }
  return plan;
}

// ── Production Batches ────────────────────────────────────────────────────────

export const createProductionBatch = async (planId, actorId, notes = "") => {
  const session = await mongoose.startSession();
  try {
    let createdBatchId;
    await session.withTransaction(async () => {
      const plan = await ProductionPlan.findById(planId).session(session);
      if (!plan) throw new ApiError(404, "Production plan not found");
      if (plan.status !== "Approved") throw new ApiError(400, "Only an approved production plan can create a batch");
      const existingBatch = await ProductionBatch.findOne({ productionPlan: plan._id }).session(session);
      if (existingBatch) throw new ApiError(409, "A production batch already exists for this plan");
      const batchNumber = await generateBatchNumber();
      const [batch] = await ProductionBatch.create([{ batchNumber, productionPlan: plan._id, productName: plan.productName, productCode: plan.productCode, plannedQuantity: plan.targetQuantity, outputUnit: plan.outputUnit, plannedStartDate: plan.plannedStartDate ?? null, plannedEndDate: plan.plannedEndDate ?? null, status: PRODUCTION_BATCH_STATUS.PLANNED, notes: notes.trim(), createdBy: actorId }], { session });
      const [bmr] = await BMR.create([{ bmrNumber: `BMR-${batchNumber}`, productionPlan: plan._id, productionBatch: batch._id, productName: plan.productName, productCode: plan.productCode, targetQuantity: plan.targetQuantity, outputUnit: plan.outputUnit, materials: (plan.materials ?? []).map((m) => ({ material: m.material, materialCode: m.materialCode, materialName: m.materialName, unit: m.unit, plannedQuantity: m.plannedQuantity, issuedQuantity: 0, consumedQuantity: 0, returnedQuantity: 0, batchNumbers: [] })), status: BMR_STATUS.OPEN, createdBy: actorId, updatedBy: actorId }], { session });
      if (!bmr.productionBatch.equals(batch._id)) throw new ApiError(500, "Failed to link BMR to production batch");
      createdBatchId = batch._id;
    });
    return await ProductionBatch.findById(createdBatchId).populate("productionPlan").populate("createdBy", "name email");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A duplicate batch or BMR number was detected. Retry the request.");
    throw error;
  } finally { await session.endSession(); }
};

export const listProductionBatches = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.productionPlan) query.productionPlan = filters.productionPlan;
  return ProductionBatch.find(query).populate("productionPlan", "planNumber productName productCode status").populate("createdBy", "name email").sort({ createdAt: -1 });
};

export const getProductionBatch = async (batchId) => {
  const batch = await ProductionBatch.findById(batchId).populate("productionPlan").populate("createdBy", "name email").populate("startedBy", "name email").populate("completedBy", "name email");
  if (!batch) throw new ApiError(404, "Production batch not found");
  return batch;
};

export const startProductionBatch = async (batchId, actorId) => {
  const session = await mongoose.startSession();
  try {
    let updatedBatch;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(batchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (![PRODUCTION_BATCH_STATUS.PLANNED, PRODUCTION_BATCH_STATUS.READY].includes(batch.status)) throw new ApiError(400, `Cannot start a batch with status "${batch.status}"`);
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(409, "BMR is missing for this batch. Resolve the BMR issue before starting.");
      batch.status = PRODUCTION_BATCH_STATUS.IN_PROGRESS; batch.actualStartDate = new Date(); batch.startedBy = actorId; batch.updatedBy = actorId;
      await batch.save({ session });
      bmr.status = BMR_STATUS.IN_PROGRESS; bmr.startedAt = batch.actualStartDate; bmr.updatedBy = actorId;
      await bmr.save({ session });
      const plan = await ProductionPlan.findById(batch.productionPlan).session(session);
      if (plan) { plan.status = "In Progress"; plan.updatedBy = actorId; await plan.save({ session }); }
      updatedBatch = batch;
    });
    return updatedBatch;
  } finally { await session.endSession(); }
};

export const holdProductionBatch = async (batchId, actorId, notes = "") => {
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) throw new ApiError(404, "Production batch not found");
  if (batch.status !== PRODUCTION_BATCH_STATUS.IN_PROGRESS) throw new ApiError(400, "Only an in-progress batch can be put on hold");
  batch.status = PRODUCTION_BATCH_STATUS.ON_HOLD; batch.updatedBy = actorId;
  if (notes.trim()) batch.notes = [batch.notes, notes.trim()].filter(Boolean).join("\n");
  await batch.save();
  return batch;
};

export const resumeProductionBatch = async (batchId, actorId) => {
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) throw new ApiError(404, "Production batch not found");
  if (batch.status !== PRODUCTION_BATCH_STATUS.ON_HOLD) throw new ApiError(400, "Only a batch on hold can be resumed");
  batch.status = PRODUCTION_BATCH_STATUS.IN_PROGRESS; batch.updatedBy = actorId;
  await batch.save();
  return batch;
};

export const completeProductionBatch = async (batchId, actorId, { actualOutputQuantity, rejectedOutputQuantity = 0 }) => {
  const session = await mongoose.startSession();
  try {
    let completedBatch;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(batchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (![PRODUCTION_BATCH_STATUS.IN_PROGRESS, PRODUCTION_BATCH_STATUS.PENDING_REVIEW].includes(batch.status)) throw new ApiError(400, "Only an in-progress or pending-review batch can be completed");
      if (!Number.isFinite(actualOutputQuantity) || actualOutputQuantity < 0 || !Number.isFinite(rejectedOutputQuantity) || rejectedOutputQuantity < 0) throw new ApiError(400, "Output quantities must be valid non-negative numbers");
      if (rejectedOutputQuantity > actualOutputQuantity) throw new ApiError(400, "Rejected output cannot exceed actual output");
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(409, "Cannot complete a batch without its BMR");
      batch.actualOutputQuantity = actualOutputQuantity; batch.rejectedOutputQuantity = rejectedOutputQuantity; batch.status = PRODUCTION_BATCH_STATUS.PENDING_REVIEW; batch.updatedBy = actorId;
      await batch.save({ session });
      bmr.actualOutputQuantity = actualOutputQuantity; bmr.rejectedOutputQuantity = rejectedOutputQuantity; bmr.status = BMR_STATUS.PENDING_REVIEW;
      await bmr.save({ session });
      completedBatch = batch;
    });
    return completedBatch;
  } finally { await session.endSession(); }
};

// ── Production Entries ────────────────────────────────────────────────────────

export const createProductionEntry = async (data, actorId) => {
  const session = await mongoose.startSession();
  try {
    let createdEntryId;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(data.productionBatchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (batch.status !== "In Progress") throw new ApiError(400, "Production entries require an in-progress batch");
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(409, "No BMR is linked to this batch");
      if (bmr.status !== "In Progress") throw new ApiError(400, "The linked BMR must be In Progress before recording entries");
      const startedAt = new Date(data.startedAt);
      const completedAt = data.completedAt ? new Date(data.completedAt) : null;
      if (Number.isNaN(startedAt.getTime()) || (completedAt && Number.isNaN(completedAt.getTime()))) throw new ApiError(400, "Invalid production entry timestamp");
      if (completedAt && completedAt < startedAt) throw new ApiError(400, "Completion time cannot be earlier than start time");
      if (startedAt > new Date()) throw new ApiError(400, "Production entry start time cannot be in the future");
      const inputQuantity = data.inputQuantity ?? 0; const outputQuantity = data.outputQuantity ?? 0; const rejectedQuantity = data.rejectedQuantity ?? 0;
      if (!Number.isFinite(inputQuantity) || !Number.isFinite(outputQuantity) || !Number.isFinite(rejectedQuantity) || inputQuantity < 0 || outputQuantity < 0 || rejectedQuantity < 0) throw new ApiError(400, "Production quantities must be valid non-negative numbers");
      if (rejectedQuantity > outputQuantity) throw new ApiError(400, "Rejected quantity cannot exceed output quantity");
      const existingEntries = await ProductionEntry.countDocuments({ productionBatch: batch._id }).session(session);
      const sequenceNumber = existingEntries + 1;
      const [entry] = await ProductionEntry.create([{ entryNumber: `PE-${randomUUID()}`, productionBatch: batch._id, bmr: bmr._id, sequenceNumber, operation: data.operation, stage: data.stage, operator: actorId, startedAt, completedAt, inputQuantity, outputQuantity, rejectedQuantity, unit: data.unit, processParameters: data.processParameters ?? {}, observations: data.observations ?? "", deviation: data.deviation ?? "", status: "Submitted", createdBy: actorId }], { session });
      bmr.processEntries.push({ step: `${data.stage}: ${data.operation}`, recordedAt: new Date(), recordedBy: actorId, observations: [data.observations?.trim(), data.deviation?.trim() ? `Deviation: ${data.deviation.trim()}` : ""].filter(Boolean).join("\n"), parameters: { ...(data.processParameters ?? {}), inputQuantity, outputQuantity, rejectedQuantity, unit: data.unit, startedAt, completedAt, productionEntryId: entry._id.toString() } });
      bmr.updatedBy = actorId;
      await bmr.save({ session });
      createdEntryId = entry._id;
    });
    return await ProductionEntry.findById(createdEntryId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("operator", "name email").populate("createdBy", "name email");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A duplicate production entry or sequence was detected. Retry the request.");
    throw error;
  } finally { await session.endSession(); }
};

export const listProductionEntries = async (filters = {}) => {
  const query = {};
  if (filters.productionBatchId) query.productionBatch = filters.productionBatchId;
  if (filters.bmrId) query.bmr = filters.bmrId;
  if (filters.status) query.status = filters.status;
  return ProductionEntry.find(query).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("operator", "name email").populate("createdBy", "name email").sort({ productionBatch: 1, sequenceNumber: 1 });
};

export const getProductionEntry = async (entryId) => {
  const entry = await ProductionEntry.findById(entryId).populate("productionBatch", "batchNumber productName productCode status").populate("bmr", "bmrNumber status").populate("operator", "name email").populate("createdBy", "name email").populate("reviewedBy", "name email");
  if (!entry) throw new ApiError(404, "Production entry not found");
  return entry;
};

// ── Material Consumption ──────────────────────────────────────────────────────

export const recordMaterialConsumption = async (batchId, data, actorId) => {
  const session = await mongoose.startSession();
  try {
    let updatedBmr;
    await session.withTransaction(async () => {
      const batch = await ProductionBatch.findById(batchId).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (batch.status !== "In Progress") throw new ApiError(400, "Material consumption can only be recorded for an in-progress batch");
      const bmr = await BMR.findOne({ productionBatch: batch._id }).session(session);
      if (!bmr) throw new ApiError(404, "BMR not found for this batch");
      if (bmr.status !== BMR_STATUS.IN_PROGRESS) throw new ApiError(400, "BMR must be in progress");
      const bmrMaterial = bmr.materials.find((item) => item.material.toString() === data.materialId);
      if (!bmrMaterial) throw new ApiError(404, "Material is not listed in this batch's BMR");
      const issueMatch = { productionBatch: batch._id, material: bmrMaterial.material, transactionType: "PRODUCTION_ISSUE" };
      if (data.materialBatchNumber) issueMatch.batchNumber = data.materialBatchNumber;
      const issueTotals = await StockTransaction.aggregate([{ $match: issueMatch }, { $group: { _id: null, totalIssued: { $sum: "$quantity" }, batchNumbers: { $addToSet: "$batchNumber" } } }]).session(session);
      const totalIssued = issueTotals[0]?.totalIssued ?? 0;
      const issuedBatchNumbers = (issueTotals[0]?.batchNumbers ?? []).filter(Boolean);
      const consumedQuantity = data.consumedQuantity;
      const returnedQuantity = data.returnedQuantity ?? 0;
      
      // Validate input quantities
      if (!Number.isFinite(consumedQuantity) || !Number.isFinite(returnedQuantity) || consumedQuantity < 0 || returnedQuantity < 0) {
        throw new ApiError(400, "Consumed and returned quantities must be non-negative numbers");
      }
      
      // Calculate already accounted quantities
      const alreadyAccountedFor = bmrMaterial.consumedQuantity + bmrMaterial.returnedQuantity;
      const remainingIssued = totalIssued - alreadyAccountedFor;
      
      if (remainingIssued < 0) {
        throw new ApiError(409, "Recorded consumption exceeds the available issued quantity");
      }
      
      // CRITICAL VALIDATION: Ensure consumed + returned never exceeds issued quantity
      if (consumedQuantity + returnedQuantity > remainingIssued) {
        throw new ApiError(
          400,
          `Material consumption validation failed: Cannot consume ${consumedQuantity} and return ${returnedQuantity} when only ${remainingIssued} ${bmrMaterial.unit || 'units'} remain available. ` +
          `(Total issued: ${totalIssued}, Already consumed: ${bmrMaterial.consumedQuantity}, Already returned: ${bmrMaterial.returnedQuantity})`
        );
      }
      
      // Additional safety check: Verify total after update won't exceed issued
      const totalAfterUpdate = alreadyAccountedFor + consumedQuantity + returnedQuantity;
      if (totalAfterUpdate > totalIssued) {
        throw new ApiError(
          400,
          `Total material usage (${totalAfterUpdate}) would exceed issued quantity (${totalIssued})`
        );
      }
      bmrMaterial.issuedQuantity = totalIssued; bmrMaterial.consumedQuantity += consumedQuantity; bmrMaterial.returnedQuantity += returnedQuantity;
      for (const number of issuedBatchNumbers) if (!bmrMaterial.batchNumbers.includes(number)) bmrMaterial.batchNumbers.push(number);
      if (data.remarks?.trim()) bmrMaterial.remarks = [bmrMaterial.remarks, data.remarks.trim()].filter(Boolean).join("\n").slice(-1000);
      bmr.updatedBy = actorId;
      await bmr.save({ session });
      updatedBmr = bmr;
    });
    return updatedBmr;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw error;
  } finally { await session.endSession(); }
};

// ── BMR Review ────────────────────────────────────────────────────────────────

export const reviewBMR = async (bmrId, data, actorId) => {
  const session = await mongoose.startSession();
  try {
    let reviewedBmr;
    await session.withTransaction(async () => {
      const bmr = await BMR.findById(bmrId).session(session);
      if (!bmr) throw new ApiError(404, "BMR not found");
      if (bmr.status !== BMR_STATUS.PENDING_REVIEW) throw new ApiError(400, "Only a BMR pending review can be reviewed");
      const batch = await ProductionBatch.findById(bmr.productionBatch).session(session);
      if (!batch) throw new ApiError(404, "Production batch not found");
      if (batch.status !== "Pending Review") throw new ApiError(409, "The production batch must also be pending review");
      if (!["Approve", "Reject"].includes(data.decision)) throw new ApiError(400, "Decision must be Approve or Reject");
      if (data.decision === "Reject" && !data.remarks?.trim()) throw new ApiError(400, "Remarks are required when rejecting a BMR");
      bmr.reviewedBy = actorId; bmr.reviewedAt = new Date(); bmr.reviewRemarks = data.remarks?.trim() ?? ""; bmr.updatedBy = actorId;
      if (data.decision === "Approve") {
        bmr.status = BMR_STATUS.COMPLETED; batch.status = "Completed"; batch.updatedBy = actorId; batch.completedBy = actorId;
        if (!batch.actualEndDate) batch.actualEndDate = new Date();
        const plan = await ProductionPlan.findById(batch.productionPlan).session(session);
        if (plan) { plan.status = "Completed"; plan.updatedBy = actorId; await plan.save({ session }); }
      } else {
        // Rejection: mark BMR as rejected and send batch back to In Progress for corrections
        bmr.status = BMR_STATUS.REJECTED; batch.status = "In Progress"; batch.updatedBy = actorId;
      }
      await bmr.save({ session }); await batch.save({ session });
      reviewedBmr = bmr;
    });
    return reviewedBmr;
  } finally { await session.endSession(); }
};
