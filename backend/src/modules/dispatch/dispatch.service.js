import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import Dispatch, { DISPATCH_STATUS } from "./models/Dispatch.js";
import FinishedGoods, { FINISHED_GOODS_STATUS } from "../finished-goods/models/FinishedGoods.js";

export const createDispatch = async (data, actorId) => {
  const session = await mongoose.startSession();
  try {
    let dispatchId;
    await session.withTransaction(async () => {
      const lot = await FinishedGoods.findOneAndUpdate(
        { _id: data.finishedGoodsId, status: FINISHED_GOODS_STATUS.AVAILABLE, availableQuantity: { $gte: data.quantity } },
        { $inc: { availableQuantity: -data.quantity, reservedQuantity: data.quantity }, $set: { updatedBy: actorId } },
        { new: true, session }
      );
      if (!lot) throw new ApiError(409, "Finished-goods lot is unavailable or has insufficient stock");
      const [dispatch] = await Dispatch.create([{ dispatchNumber: `DSP-${randomUUID()}`, finishedGoods: lot._id, lotNumber: lot.lotNumber, productCode: lot.productCode, productName: lot.productName, quantity: data.quantity, unit: lot.unit, customerName: data.customerName, destination: data.destination, referenceNumber: data.referenceNumber ?? "", notes: data.notes ?? "", status: DISPATCH_STATUS.RESERVED, reservedAt: new Date(), createdBy: actorId, updatedBy: actorId }], { session });
      dispatchId = dispatch._id;
    });
    return Dispatch.findById(dispatchId).populate("finishedGoods", "lotNumber productName productCode status").populate("createdBy", "name email");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A duplicate dispatch number was detected. Retry the request.");
    throw error;
  } finally { await session.endSession(); }
};

export const confirmDispatch = async (dispatchId, actorId) => {
  const session = await mongoose.startSession();
  try {
    let resultId;
    await session.withTransaction(async () => {
      const dispatch = await Dispatch.findOneAndUpdate({ _id: dispatchId, status: DISPATCH_STATUS.RESERVED }, { $set: { status: DISPATCH_STATUS.DISPATCHED, dispatchedAt: new Date(), dispatchedBy: actorId, updatedBy: actorId } }, { new: true, session });
      if (!dispatch) throw new ApiError(409, "Dispatch not found or is no longer awaiting confirmation");
      const lot = await FinishedGoods.findOneAndUpdate({ _id: dispatch.finishedGoods, reservedQuantity: { $gte: dispatch.quantity } }, { $inc: { reservedQuantity: -dispatch.quantity, dispatchedQuantity: dispatch.quantity }, $set: { updatedBy: actorId } }, { new: true, session });
      if (!lot) throw new ApiError(409, "Reserved stock could not be reconciled. Dispatch confirmation aborted.");
      if (lot.availableQuantity === 0 && lot.reservedQuantity === 0) { lot.status = FINISHED_GOODS_STATUS.DEPLETED; await lot.save({ session }); }
      resultId = dispatch._id;
    });
    return Dispatch.findById(resultId).populate("finishedGoods", "lotNumber productName productCode status").populate("dispatchedBy", "name email");
  } finally { await session.endSession(); }
};

export const cancelDispatch = async (dispatchId, actorId, reason) => {
  const session = await mongoose.startSession();
  try {
    let resultId;
    await session.withTransaction(async () => {
      const dispatch = await Dispatch.findOneAndUpdate({ _id: dispatchId, status: DISPATCH_STATUS.RESERVED }, { $set: { status: DISPATCH_STATUS.CANCELLED, cancelledAt: new Date(), cancelledBy: actorId, cancellationReason: reason.trim(), updatedBy: actorId } }, { new: true, session });
      if (!dispatch) throw new ApiError(409, "Dispatch not found or cannot be cancelled in its current status");
      const lot = await FinishedGoods.findOneAndUpdate({ _id: dispatch.finishedGoods, reservedQuantity: { $gte: dispatch.quantity } }, { $inc: { reservedQuantity: -dispatch.quantity, availableQuantity: dispatch.quantity }, $set: { updatedBy: actorId } }, { new: true, session });
      if (!lot) throw new ApiError(409, "Reservation could not be reconciled. Cancellation aborted.");
      if (lot.status === FINISHED_GOODS_STATUS.DEPLETED) { lot.status = FINISHED_GOODS_STATUS.AVAILABLE; await lot.save({ session }); }
      resultId = dispatch._id;
    });
    return Dispatch.findById(resultId).populate("finishedGoods", "lotNumber productName productCode status").populate("cancelledBy", "name email");
  } finally { await session.endSession(); }
};

export const listDispatches = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.finishedGoodsId) query.finishedGoods = filters.finishedGoodsId;
  return Dispatch.find(query).populate("finishedGoods", "lotNumber productName productCode status").populate("createdBy", "name email").populate("dispatchedBy", "name email").sort({ createdAt: -1 });
};

export const getDispatch = async (dispatchId) => {
  const dispatch = await Dispatch.findById(dispatchId).populate("finishedGoods", "lotNumber productName productCode status").populate("createdBy", "name email").populate("dispatchedBy", "name email").populate("cancelledBy", "name email");
  if (!dispatch) throw new ApiError(404, "Dispatch not found");
  return dispatch;
};

// ── Direct Dispatch ───────────────────────────────────────────────────────────
// One-step dispatch: subtracts from finished goods and creates a DISPATCHED record.

export const directDispatch = async (data, actorId) => {
  const session = await mongoose.startSession();
  try {
    let dispatchId;
    await session.withTransaction(async () => {
      const lot = await FinishedGoods.findById(data.finishedGoodsId).session(session);
      if (!lot) throw new ApiError(404, "Finished-goods lot not found");
      if (lot.status !== FINISHED_GOODS_STATUS.AVAILABLE) throw new ApiError(409, "This finished-goods lot is not available for dispatch");
      if (lot.availableQuantity < data.quantity) throw new ApiError(409, `Insufficient stock. Available: ${lot.availableQuantity} ${lot.unit}, requested: ${data.quantity} ${lot.unit}`);

      // Subtract from available, add to dispatched
      lot.availableQuantity -= data.quantity;
      lot.dispatchedQuantity += data.quantity;
      lot.updatedBy = actorId;
      if (lot.availableQuantity === 0) {
        lot.status = FINISHED_GOODS_STATUS.DEPLETED;
      }
      await lot.save({ session });

      // Create dispatch record already in DISPATCHED state
      const [dispatch] = await Dispatch.create([{
        dispatchNumber: `DSP-${randomUUID()}`,
        finishedGoods: lot._id,
        lotNumber: lot.lotNumber,
        productCode: lot.productCode,
        productName: lot.productName,
        bmrNumber: lot.bmrNumber || "",
        quantity: data.quantity,
        unit: lot.unit,
        customerName: data.customerName || "",
        destination: data.destination || "",
        referenceNumber: data.referenceNumber || "",
        notes: data.notes || "",
        dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : new Date(),
        status: DISPATCH_STATUS.DISPATCHED,
        dispatchedAt: new Date(),
        dispatchedBy: actorId,
        createdBy: actorId,
        updatedBy: actorId,
      }], { session });
      dispatchId = dispatch._id;
    });
    return Dispatch.findById(dispatchId).populate("finishedGoods", "lotNumber productName productCode status availableQuantity").populate("createdBy", "name email").populate("dispatchedBy", "name email");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.code === 11000) throw new ApiError(409, "A duplicate dispatch number was detected. Retry the request.");
    throw error;
  } finally { await session.endSession(); }
};
