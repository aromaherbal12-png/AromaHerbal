import { ApiResponse } from "../../utils/ApiResponse.js";
import * as productionService from "./production.service.js";

function handler(action, message, status = 200) {
  return async (req, res, next) => {
    try {
      const data = await action(req);
      res.status(status).json(new ApiResponse(status, message, data));
    } catch (error) {
      next(error);
    }
  };
}

// Production Plans
export const createProductionPlan = handler(
  (req) => productionService.createProductionPlan(req.validated.body, req.user._id),
  "Production Plan created successfully.",
  201
);
export const listProductionPlans = handler(
  (req) => productionService.listProductionPlans(req.validated.query),
  "Production Plans retrieved successfully."
);
export const getProductionPlan = handler(
  (req) => productionService.getProductionPlan(req.validated.params.id),
  "Production Plan retrieved successfully."
);
export const approveProductionPlan = handler(
  (req) => productionService.approveProductionPlan(req.validated.params.id, req.user._id),
  "Production Plan approved successfully."
);
export const cancelProductionPlan = handler(
  (req) => productionService.cancelProductionPlan(req.validated.params.id, req.user._id),
  "Production Plan cancelled successfully."
);

// Production Batches
export const createProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.createProductionBatch(req.validated.body.productionPlanId, req.user._id, req.validated.body.notes ?? "");
    res.status(201).json(new ApiResponse(201, "Production batch and BMR created successfully", batch));
  } catch (error) { next(error); }
};

export const listProductionBatchesController = async (req, res, next) => {
  try {
    const batches = await productionService.listProductionBatches(req.validated.query);
    res.status(200).json(new ApiResponse(200, "Production batches retrieved successfully", batches));
  } catch (error) { next(error); }
};

export const getProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.getProductionBatch(req.validated.params.id);
    res.status(200).json(new ApiResponse(200, "Production batch retrieved successfully", batch));
  } catch (error) { next(error); }
};

export const startProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.startProductionBatch(req.validated.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, "Production batch started", batch));
  } catch (error) { next(error); }
};

export const holdProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.holdProductionBatch(req.validated.params.id, req.user._id, req.validated.body.notes ?? "");
    res.status(200).json(new ApiResponse(200, "Production batch put on hold", batch));
  } catch (error) { next(error); }
};

export const resumeProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.resumeProductionBatch(req.validated.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, "Production batch resumed", batch));
  } catch (error) { next(error); }
};

export const completeProductionBatchController = async (req, res, next) => {
  try {
    const batch = await productionService.completeProductionBatch(req.validated.params.id, req.user._id, req.validated.body);
    res.status(200).json(new ApiResponse(200, "Production batch completed", batch));
  } catch (error) { next(error); }
};

// Production Entries
export const createProductionEntryController = async (req, res, next) => {
  try {
    const entry = await productionService.createProductionEntry(req.validated.body, req.user._id);
    res.status(201).json(new ApiResponse(201, "Production entry recorded successfully", entry));
  } catch (error) { next(error); }
};

export const listProductionEntriesController = async (req, res, next) => {
  try {
    const entries = await productionService.listProductionEntries(req.validated.query);
    res.status(200).json(new ApiResponse(200, "Production entries retrieved successfully", entries));
  } catch (error) { next(error); }
};

export const getProductionEntryController = async (req, res, next) => {
  try {
    const entry = await productionService.getProductionEntry(req.validated.params.id);
    res.status(200).json(new ApiResponse(200, "Production entry retrieved successfully", entry));
  } catch (error) { next(error); }
};

// Material Consumption & BMR Review
export const recordMaterialConsumptionController = async (req, res, next) => {
  try {
    const bmr = await productionService.recordMaterialConsumption(req.validated.params.id, req.validated.body, req.user._id);
    res.status(200).json(new ApiResponse(200, "Material consumption recorded successfully", bmr));
  } catch (error) { next(error); }
};

export const reviewBMRController = async (req, res, next) => {
  try {
    const bmr = await productionService.reviewBMR(req.validated.params.id, req.validated.body, req.user._id);
    const msg = req.validated.body.decision === "Approve" ? "BMR approved successfully" : "BMR rejected and returned for corrections";
    res.status(200).json(new ApiResponse(200, msg, bmr));
  } catch (error) { next(error); }
};
