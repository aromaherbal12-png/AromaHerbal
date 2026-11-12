import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  createMachine,
  listMachines,
  getMachineById,
  updateMachine,
  updateMachineStatus,
  getMachineDowntimeHistory,
  reportMachineDowntime,
  startMachineDowntime,
  resolveMachineDowntime,
  cancelMachineDowntime,
} from "./machines.service.js";

export const createMachineController = async (req, res, next) => {
  try {
    const machine = await createMachine(req.validated.body, req.user._id);
    return res.status(201).json(new ApiResponse(201, "Machine created successfully", machine));
  } catch (error) { next(error); }
};

export const listMachinesController = async (req, res, next) => {
  try {
    const result = await listMachines(req.validated.query);
    return res.status(200).json(new ApiResponse(200, "Machines retrieved successfully", result));
  } catch (error) { next(error); }
};

export const getMachineController = async (req, res, next) => {
  try {
    const machine = await getMachineById(req.validated.params.id);
    return res.status(200).json(new ApiResponse(200, "Machine retrieved successfully", machine));
  } catch (error) { next(error); }
};

export const updateMachineController = async (req, res, next) => {
  try {
    const machine = await updateMachine(req.validated.params.id, req.validated.body, req.user._id);
    return res.status(200).json(new ApiResponse(200, "Machine updated successfully", machine));
  } catch (error) { next(error); }
};

export const updateMachineStatusController = async (req, res, next) => {
  try {
    const machine = await updateMachineStatus(req.validated.params.id, req.validated.body.status, req.user._id);
    return res.status(200).json(new ApiResponse(200, "Machine status updated successfully", machine));
  } catch (error) { next(error); }
};

export const getMachineDowntimeHistoryController = async (req, res, next) => {
  try {
    const result = await getMachineDowntimeHistory(req.validated.params.id, req.validated.query);
    return res.status(200).json(new ApiResponse(200, "Machine downtime history retrieved successfully", result));
  } catch (error) { next(error); }
};

export const reportMachineDowntimeController = async (req, res, next) => {
  try {
    const downtime = await reportMachineDowntime(req.validated.body, req.user._id);
    return res.status(201).json(new ApiResponse(201, "Machine downtime reported successfully", downtime));
  } catch (error) { next(error); }
};

export const startMachineDowntimeController = async (req, res, next) => {
  try {
    const downtime = await startMachineDowntime(req.validated.params.downtimeId, req.user._id);
    return res.status(200).json(new ApiResponse(200, "Machine maintenance started successfully", downtime));
  } catch (error) { next(error); }
};

export const resolveMachineDowntimeController = async (req, res, next) => {
  try {
    const downtime = await resolveMachineDowntime(req.validated.params.downtimeId, req.validated.body, req.user._id);
    return res.status(200).json(new ApiResponse(200, "Machine downtime resolved successfully", downtime));
  } catch (error) { next(error); }
};

export const cancelMachineDowntimeController = async (req, res, next) => {
  try {
    const downtime = await cancelMachineDowntime(req.validated.params.downtimeId, req.validated.body.reason, req.user._id);
    return res.status(200).json(new ApiResponse(200, "Machine downtime cancelled successfully", downtime));
  } catch (error) { next(error); }
};
