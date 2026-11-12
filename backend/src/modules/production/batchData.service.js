import BatchData from "./models/BatchData.js";
import { ApiError } from "../../utils/ApiError.js";

/** Create a new batch data record (or upsert if batchId already exists). */
export async function createBatchData(data, actorId) {
  if (!data.batchId) throw new ApiError(400, "batchId is required");
  if (!data.data) throw new ApiError(400, "Batch data payload is required");

  const existing = await BatchData.findOne({ batchId: data.batchId });
  if (existing) throw new ApiError(409, "Batch data already exists for this batchId");

  const record = await BatchData.create({
    batchId: data.batchId,
    data: data.data,
    createdBy: actorId,
    updatedBy: actorId,
  });

  return record;
}

/** Upsert: create if not exists, update if exists. */
export async function upsertBatchData(data, actorId) {
  if (!data.batchId) throw new ApiError(400, "batchId is required");
  if (!data.data) throw new ApiError(400, "Batch data payload is required");

  const record = await BatchData.findOneAndUpdate(
    { batchId: data.batchId },
    {
      $set: {
        data: data.data,
        updatedBy: actorId,
      },
      $setOnInsert: {
        batchId: data.batchId,
        createdBy: actorId,
      },
    },
    { new: true, upsert: true }
  );

  return record;
}

/** List all batch data records, newest first. */
export async function listBatchData() {
  return BatchData.find().sort({ updatedAt: -1 }).lean();
}

/** Get a single batch data record by batchId. */
export async function getBatchDataByBatchId(batchId) {
  const record = await BatchData.findOne({ batchId }).lean();
  if (!record) throw new ApiError(404, "Batch data not found");
  return record;
}

/** Delete a batch data record by batchId. */
export async function deleteBatchData(batchId, actorId) {
  const record = await BatchData.findOneAndDelete({ batchId });
  if (!record) throw new ApiError(404, "Batch data not found");
  return record;
}
