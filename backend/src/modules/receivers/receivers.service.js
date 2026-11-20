import Receiver from "./models/Receiver.js";
import { ApiError } from "../../utils/ApiError.js";

export async function createReceiver(data, actorId) {
  const receiver = await Receiver.create({
    name: data.name.trim(),
    address: data.address.trim(),
    gstNo: data.gstNo?.trim() || "",
    createdBy: actorId,
  });
  return receiver.toObject();
}

export async function listReceivers() {
  return Receiver.find()
    .select("-__v")
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateReceiver(id, data, actorId) {
  const receiver = await Receiver.findById(id);
  if (!receiver) throw new ApiError(404, "Receiver not found");

  if (data.name    !== undefined) receiver.name    = data.name.trim();
  if (data.address !== undefined) receiver.address = data.address.trim();
  if (data.gstNo   !== undefined) receiver.gstNo   = data.gstNo.trim();
  receiver.updatedBy = actorId;

  await receiver.save();
  return receiver.toObject();
}
