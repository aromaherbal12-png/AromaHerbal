import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  getDashboardSummary,
  getProductionDashboard,
  getInventoryDashboard,
  getQualityDashboard,
  getMachineDashboard,
  getDispatchDashboard,
} from "./dashboard.service.js";

export const getDashboardSummaryController = async (req, res, next) => {
  try {
    const data = await getDashboardSummary();
    return res.status(200).json(new ApiResponse(200, "Dashboard summary retrieved successfully", data));
  } catch (error) { next(error); }
};

export const getProductionDashboardController = async (req, res, next) => {
  try {
    const data = await getProductionDashboard();
    return res.status(200).json(new ApiResponse(200, "Production dashboard retrieved successfully", data));
  } catch (error) { next(error); }
};

export const getInventoryDashboardController = async (req, res, next) => {
  try {
    const data = await getInventoryDashboard();
    return res.status(200).json(new ApiResponse(200, "Inventory dashboard retrieved successfully", data));
  } catch (error) { next(error); }
};

export const getQualityDashboardController = async (req, res, next) => {
  try {
    const data = await getQualityDashboard();
    return res.status(200).json(new ApiResponse(200, "Quality dashboard retrieved successfully", data));
  } catch (error) { next(error); }
};

export const getMachineDashboardController = async (req, res, next) => {
  try {
    const data = await getMachineDashboard();
    return res.status(200).json(new ApiResponse(200, "Machine dashboard retrieved successfully", data));
  } catch (error) { next(error); }
};

export const getDispatchDashboardController = async (req, res, next) => {
  try {
    const data = await getDispatchDashboard();
    return res.status(200).json(new ApiResponse(200, "Dispatch dashboard retrieved successfully", data));
  } catch (error) { next(error); }
};
