/**
 * qualityApi.js
 * API service for quality control inspections
 */

import api from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL QC
// ═══════════════════════════════════════════════════════════════════════════

export const materialQCApi = {
  list: (params = {}) => api.get("/quality/material-qc", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status }),
      ...(params.goodsReceiptId && { goodsReceiptId: params.goodsReceiptId }),
      ...(params.search && { search: params.search }),
    })
  }),

  get: (id) => api.get(`/quality/material-qc/${id}`),

  create: (data) => api.post("/quality/material-qc", {
    goodsReceiptId: data.goodsReceiptId,
    goodsReceiptItemId: data.goodsReceiptItemId,
    inspectedQty: data.inspectedQty,
    acceptedQty: data.acceptedQty,
    rejectedQty: data.rejectedQty,
    testResults: data.testResults || {},
    remarks: data.remarks || "",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION QC
// ═══════════════════════════════════════════════════════════════════════════

export const productionQCApi = {
  list: (params = {}) => api.get("/quality/production-qc", {
    params: new URLSearchParams({
      ...(params.productionBatchId && { productionBatchId: params.productionBatchId }),
      ...(params.status && { status: params.status }),
    })
  }),

  get: (id) => api.get(`/quality/production-qc/${id}`),

  create: (data) => api.post("/quality/production-qc", {
    productionBatchId: data.productionBatchId,
    sampleQuantity: data.sampleQuantity,
    sampleUnit: data.sampleUnit,
    tests: data.tests.map(test => ({
      testName: test.testName,
      specification: test.specification || "",
      actualResult: test.actualResult,
      unit: test.unit || "",
      result: test.result, // "Pass", "Fail", or "Not Applicable"
      remarks: test.remarks || "",
    })),
    decisionRemarks: data.decisionRemarks || "",
  }),

  decide: (id, data) => api.patch(`/quality/production-qc/${id}/decision`, {
    decision: data.decision, // "Accepted", "Rejected", or "On Hold"
    decisionRemarks: data.decisionRemarks || "",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const qualityApi = {
  materialQC: materialQCApi,
  productionQC: productionQCApi,
};

export default qualityApi;
