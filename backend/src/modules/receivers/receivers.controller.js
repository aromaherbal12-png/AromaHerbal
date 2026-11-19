import { createReceiver, listReceivers, updateReceiver } from "./receivers.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export async function create(req, res, next) {
  try {
    const receiver = await createReceiver(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, "Receiver created successfully", receiver));
  } catch (err) { next(err); }
}

export async function list(req, res, next) {
  try {
    const receivers = await listReceivers();
    res.status(200).json(new ApiResponse(200, "Receivers retrieved successfully", receivers));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const receiver = await updateReceiver(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, "Receiver updated successfully", receiver));
  } catch (err) { next(err); }
}
