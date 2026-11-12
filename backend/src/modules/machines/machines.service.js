import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { ApiError } from "../../utils/ApiError.js";
import Machine, { MACHINE_STATUS } from "./models/Machine.js";
import MachineDowntime, { DOWNTIME_STATUS, DOWNTIME_TYPES } from "./models/MachineDowntime.js";

const VALID_STATUSES = Object.values(MACHINE_STATUS);

const ensureValidId = (id, label = "Machine ID") => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
};

const ensureValidDates = (data) => {
  const installationDate    = data.installationDate    ? new Date(data.installationDate)    : null;
  const lastMaintenanceDate = data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null;
  const nextMaintenanceDate = data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null;

  for (const date of [installationDate, lastMaintenanceDate, nextMaintenanceDate]) {
    if (date && Number.isNaN(date.getTime())) throw new ApiError(400, "One or more maintenance dates are invalid");
  }
  if (installationDate && lastMaintenanceDate && lastMaintenanceDate < installationDate)
    throw new ApiError(400, "Last maintenance date cannot precede installation date");
  if (lastMaintenanceDate && nextMaintenanceDate && nextMaintenanceDate < lastMaintenanceDate)
    throw new ApiError(400, "Next maintenance date cannot precede last maintenance date");
};

const handleDuplicateKey = (error) => {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    throw new ApiError(409, `${field} already exists`);
  }
  throw error;
};

export const createMachine = async (data, actorId) => {
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  ensureValidDates(data);
  if (data.status && !VALID_STATUSES.includes(data.status)) throw new ApiError(400, "Invalid machine status");
  try {
    return await Machine.create({ ...data, machineCode: data.machineCode?.trim().toUpperCase(), createdBy: actorId, updatedBy: actorId });
  } catch (error) { handleDuplicateKey(error); }
};

export const listMachines = async (filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const query = {};
  if (filters.status) {
    if (!VALID_STATUSES.includes(filters.status)) throw new ApiError(400, "Invalid machine status filter");
    query.status = filters.status;
  }
  if (filters.machineType) query.machineType = filters.machineType;
  if (filters.location) query.location = { $regex: String(filters.location).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (filters.search) {
    const escaped = String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { machineCode: { $regex: escaped, $options: "i" } },
      { machineName: { $regex: escaped, $options: "i" } },
      { serialNumber: { $regex: escaped, $options: "i" } },
      { modelNumber:  { $regex: escaped, $options: "i" } },
    ];
  }
  const [machines, total] = await Promise.all([
    Machine.find(query).populate("createdBy", "name email").populate("updatedBy", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Machine.countDocuments(query),
  ]);
  return { machines, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const getMachineById = async (machineId) => {
  ensureValidId(machineId);
  const machine = await Machine.findById(machineId).populate("createdBy", "name email").populate("updatedBy", "name email").lean();
  if (!machine) throw new ApiError(404, "Machine not found");
  return machine;
};

export const updateMachine = async (machineId, data, actorId) => {
  ensureValidId(machineId);
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  const machine = await Machine.findById(machineId);
  if (!machine) throw new ApiError(404, "Machine not found");
  if (data.machineCode) data.machineCode = data.machineCode.trim().toUpperCase();
  ensureValidDates({
    installationDate:    data.installationDate    ?? machine.installationDate,
    lastMaintenanceDate: data.lastMaintenanceDate ?? machine.lastMaintenanceDate,
    nextMaintenanceDate: data.nextMaintenanceDate ?? machine.nextMaintenanceDate,
  });
  if (data.status && !VALID_STATUSES.includes(data.status)) throw new ApiError(400, "Invalid machine status");
  if (data.status === MACHINE_STATUS.AVAILABLE) {
    const activeDowntime = await MachineDowntime.exists({ machine: machine._id, status: { $in: [DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS] } });
    if (activeDowntime) throw new ApiError(409, "Resolve or cancel active downtime before marking the machine Available");
  }
  const allowedFields = ["machineCode","machineName","machineType","manufacturer","modelNumber","serialNumber","location","capacity","installationDate","lastMaintenanceDate","nextMaintenanceDate","status","maintenanceIntervalDays","remarks"];
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) machine.set(field, data[field]);
  }
  machine.updatedBy = actorId;
  try { await machine.save(); } catch (error) { handleDuplicateKey(error); }
  return machine;
};

export const updateMachineStatus = async (machineId, status, actorId) => {
  ensureValidId(machineId);
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  if (!VALID_STATUSES.includes(status)) throw new ApiError(400, "Invalid machine status");
  const machine = await Machine.findById(machineId);
  if (!machine) throw new ApiError(404, "Machine not found");
  if (status === MACHINE_STATUS.AVAILABLE) {
    const activeDowntime = await MachineDowntime.exists({ machine: machine._id, status: { $in: [DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS] } });
    if (activeDowntime) throw new ApiError(409, "Cannot mark machine Available while downtime is active");
  }
  machine.status = status; machine.updatedBy = actorId;
  await machine.save();
  return machine;
};

export const getMachineDowntimeHistory = async (machineId, filters = {}) => {
  ensureValidId(machineId);
  const machineExists = await Machine.exists({ _id: machineId });
  if (!machineExists) throw new ApiError(404, "Machine not found");
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const query = { machine: machineId };
  if (filters.status) {
    if (!Object.values(DOWNTIME_STATUS).includes(filters.status)) throw new ApiError(400, "Invalid downtime status filter");
    query.status = filters.status;
  }
  const [records, total] = await Promise.all([
    MachineDowntime.find(query).populate("reportedBy", "name email").populate("resolvedBy", "name email").sort({ reportedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    MachineDowntime.countDocuments(query),
  ]);
  return { records, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const reportMachineDowntime = async (data, actorId) => {
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  ensureValidId(data.machineId, "Machine ID");
  const machine = await Machine.findById(data.machineId);
  if (!machine) throw new ApiError(404, "Machine not found");
  if (machine.status === MACHINE_STATUS.DECOMMISSIONED) throw new ApiError(409, "Cannot report downtime for a decommissioned machine");
  const activeDowntime = await MachineDowntime.exists({ machine: machine._id, status: { $in: [DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS] } });
  if (activeDowntime) throw new ApiError(409, "This machine already has active downtime");
  const reportedAt = data.reportedAt ? new Date(data.reportedAt) : new Date();
  if (Number.isNaN(reportedAt.getTime())) throw new ApiError(400, "Invalid downtime report date");
  if (data.expectedResolutionAt && new Date(data.expectedResolutionAt) < reportedAt) throw new ApiError(400, "Expected resolution cannot precede the report date");
  const downtimeNumber = `DT-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const downtime = await MachineDowntime.create({ downtimeNumber, machine: machine._id, downtimeType: data.downtimeType, reason: data.reason, reportedAt, reportedBy: actorId, expectedResolutionAt: data.expectedResolutionAt || null, productionImpact: data.productionImpact || "", relatedProductionBatch: data.relatedProductionBatch || null, remarks: data.remarks || "", createdBy: actorId, updatedBy: actorId, status: DOWNTIME_STATUS.OPEN });
  machine.status = MACHINE_STATUS.OUT_OF_SERVICE; machine.updatedBy = actorId;
  await machine.save();
  return downtime;
};

export const startMachineDowntime = async (downtimeId, actorId) => {
  ensureValidId(downtimeId, "Downtime ID");
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  const downtime = await MachineDowntime.findById(downtimeId);
  if (!downtime) throw new ApiError(404, "Downtime record not found");
  if (downtime.status !== DOWNTIME_STATUS.OPEN) throw new ApiError(409, "Only open downtime records can be started");
  const machine = await Machine.findById(downtime.machine);
  if (!machine) throw new ApiError(404, "Associated machine not found");
  downtime.status = DOWNTIME_STATUS.IN_PROGRESS; downtime.startedAt = new Date(); downtime.updatedBy = actorId;
  machine.status = MACHINE_STATUS.UNDER_MAINTENANCE; machine.updatedBy = actorId;
  await downtime.save(); await machine.save();
  return downtime;
};

export const resolveMachineDowntime = async (downtimeId, data, actorId) => {
  ensureValidId(downtimeId, "Downtime ID");
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  const downtime = await MachineDowntime.findById(downtimeId);
  if (!downtime) throw new ApiError(404, "Downtime record not found");
  if (![DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS].includes(downtime.status)) throw new ApiError(409, "This downtime record is not active");
  const resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : new Date();
  if (Number.isNaN(resolvedAt.getTime())) throw new ApiError(400, "Invalid resolution date");
  if (resolvedAt < downtime.reportedAt) throw new ApiError(400, "Resolution cannot precede the report date");
  const machine = await Machine.findById(downtime.machine);
  if (!machine) throw new ApiError(404, "Associated machine not found");
  downtime.status = DOWNTIME_STATUS.RESOLVED; downtime.resolvedAt = resolvedAt; downtime.resolvedBy = actorId;
  downtime.resolutionNotes = data.resolutionNotes;
  downtime.downtimeMinutes = Math.max(0, Math.round((resolvedAt.getTime() - downtime.reportedAt.getTime()) / 60000));
  downtime.updatedBy = actorId;
  machine.status = MACHINE_STATUS.AVAILABLE; machine.lastMaintenanceDate = resolvedAt; machine.updatedBy = actorId;
  if (machine.maintenanceIntervalDays) machine.nextMaintenanceDate = new Date(resolvedAt.getTime() + machine.maintenanceIntervalDays * 24 * 60 * 60 * 1000);
  await downtime.save(); await machine.save();
  return downtime;
};

export const cancelMachineDowntime = async (downtimeId, reason, actorId) => {
  ensureValidId(downtimeId, "Downtime ID");
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(401, "Authenticated user ID is invalid");
  if (!reason?.trim()) throw new ApiError(400, "Cancellation reason is required");
  const downtime = await MachineDowntime.findById(downtimeId);
  if (!downtime) throw new ApiError(404, "Downtime record not found");
  if (![DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS].includes(downtime.status)) throw new ApiError(409, "Only active downtime records can be cancelled");
  const machine = await Machine.findById(downtime.machine);
  if (!machine) throw new ApiError(404, "Associated machine not found");
  const otherActiveDowntime = await MachineDowntime.exists({ _id: { $ne: downtime._id }, machine: machine._id, status: { $in: [DOWNTIME_STATUS.OPEN, DOWNTIME_STATUS.IN_PROGRESS] } });
  downtime.status = DOWNTIME_STATUS.CANCELLED; downtime.resolutionNotes = reason.trim(); downtime.updatedBy = actorId;
  if (!otherActiveDowntime) { machine.status = MACHINE_STATUS.AVAILABLE; machine.updatedBy = actorId; }
  await downtime.save(); await machine.save();
  return downtime;
};
