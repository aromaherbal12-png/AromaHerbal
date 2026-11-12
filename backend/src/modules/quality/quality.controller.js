import { ApiResponse } from "../../utils/ApiResponse.js";
import * as qualityService from "./quality.service.js";

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

// Material QC
export const createMaterialQC = handler(
  (req) => qualityService.createMaterialQC(req.validated.body, req.user._id),
  "Material QC recorded successfully.",
  201
);
export const listMaterialQC = handler(
  (req) => qualityService.listMaterialQC(req.validated.query),
  "Material QC records retrieved successfully."
);
export const getMaterialQC = handler(
  (req) => qualityService.getMaterialQC(req.validated.params.id),
  "Material QC record retrieved successfully."
);

// Production QC
export const createProductionQCController = async (req, res, next) => {
  try {
    const qc = await qualityService.createProductionQC(req.validated.body, req.user._id);
    res.status(201).json(new ApiResponse(201, "Production QC inspection created successfully", qc));
  } catch (error) { next(error); }
};

export const listProductionQCController = async (req, res, next) => {
  try {
    const inspections = await qualityService.listProductionQC(req.validated.query);
    res.status(200).json(new ApiResponse(200, "Production QC inspections retrieved successfully", inspections));
  } catch (error) { next(error); }
};

export const getProductionQCController = async (req, res, next) => {
  try {
    const qc = await qualityService.getProductionQC(req.validated.params.id);
    res.status(200).json(new ApiResponse(200, "Production QC inspection retrieved successfully", qc));
  } catch (error) { next(error); }
};

export const decideProductionQCController = async (req, res, next) => {
  try {
    const qc = await qualityService.decideProductionQC(req.validated.params.id, req.validated.body, req.user._id);
    res.status(200).json(new ApiResponse(200, `Production QC decision recorded: ${qc.status}`, qc));
  } catch (error) { next(error); }
};
