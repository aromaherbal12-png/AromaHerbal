import { ApiResponse } from "../../utils/ApiResponse.js";
import { getReportsSummary } from "./reports.service.js";

export async function getReports(req, res, next) {
  try {
    const data = await getReportsSummary();
    res.status(200).json(new ApiResponse(200, "Reports retrieved successfully", data));
  } catch (error) { next(error); }
}
