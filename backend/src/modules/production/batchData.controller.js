import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  createBatchData,
  upsertBatchData,
  listBatchData,
  getBatchDataByBatchId,
  deleteBatchData,
} from "./batchData.service.js";

export async function createBatchDataController(req, res, next) {
  try {
    const record = await createBatchData(req.validated.body, req.user._id);
    res.status(201).json(new ApiResponse(201, "Batch data created.", record));
  } catch (error) {
    next(error);
  }
}

export async function upsertBatchDataController(req, res, next) {
  try {
    const record = await upsertBatchData(req.validated.body, req.user._id);
    res.status(200).json(new ApiResponse(200, "Batch data saved.", record));
  } catch (error) {
    next(error);
  }
}

export async function listBatchDataController(req, res, next) {
  try {
    const records = await listBatchData();
    res.status(200).json(new ApiResponse(200, "Batch data list retrieved.", records));
  } catch (error) {
    next(error);
  }
}

export async function getBatchDataController(req, res, next) {
  try {
    const record = await getBatchDataByBatchId(req.validated.params.batchId);
    res.status(200).json(new ApiResponse(200, "Batch data retrieved.", record));
  } catch (error) {
    next(error);
  }
}

export async function deleteBatchDataController(req, res, next) {
  try {
    await deleteBatchData(req.validated.params.batchId, req.user._id);
    res.status(200).json(new ApiResponse(200, "Batch data deleted."));
  } catch (error) {
    next(error);
  }
}
