/**
 * productionApi.js
 * API service for production plans, batches, entries, and BMR
 */

import api from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION PLANS
// ═══════════════════════════════════════════════════════════════════════════

export const productionPlansApi = {
  list: (params = {}) => api.get("/production/plans", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status }),
      ...(params.search && { search: params.search }),
    })
  }),

  get: (id) => api.get(`/production/plans/${id}`),

  create: (data) => api.post("/production/plans", {
    productName: data.productName,
    productCode: data.productCode,
    targetQuantity: data.targetQuantity,
    outputUnit: data.outputUnit,
    plannedStartDate: data.plannedStartDate,
    plannedEndDate: data.plannedEndDate,
    materials: data.materials.map(m => ({
      materialId: m.materialId || m.material,
      quantityPerUnit: m.quantityPerUnit,
    })),
    notes: data.notes || "",
  }),

  approve: (id) => api.patch(`/production/plans/${id}/approve`),

  cancel: (id) => api.patch(`/production/plans/${id}/cancel`),
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION BATCHES
// ═══════════════════════════════════════════════════════════════════════════

export const productionBatchesApi = {
  list: (params = {}) => api.get("/production/batches", {
    params: new URLSearchParams({
      ...(params.status && { status: params.status }),
      ...(params.productionPlan && { productionPlan: params.productionPlan }),
    })
  }),

  get: (id) => api.get(`/production/batches/${id}`),

  create: (data) => api.post("/production/batches", {
    productionPlanId: data.productionPlanId,
    notes: data.notes || "",
  }),

  start: (id) => api.patch(`/production/batches/${id}/start`),

  hold: (id, notes) => api.patch(`/production/batches/${id}/hold`, { notes }),

  resume: (id) => api.patch(`/production/batches/${id}/resume`),

  complete: (id, data) => api.patch(`/production/batches/${id}/complete`, {
    actualOutputQuantity: data.actualOutputQuantity,
    rejectedOutputQuantity: data.rejectedOutputQuantity || 0,
  }),

  recordMaterialConsumption: (batchId, data) => 
    api.post(`/production/batches/${batchId}/material-consumption`, {
      materialId: data.materialId,
      consumedQuantity: data.consumedQuantity,
      returnedQuantity: data.returnedQuantity || 0,
      materialBatchNumber: data.materialBatchNumber || "",
      remarks: data.remarks || "",
    }),
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION ENTRIES
// ═══════════════════════════════════════════════════════════════════════════

export const productionEntriesApi = {
  list: (params = {}) => api.get("/production/entries", {
    params: new URLSearchParams({
      ...(params.productionBatchId && { productionBatchId: params.productionBatchId }),
      ...(params.bmrId && { bmrId: params.bmrId }),
      ...(params.status && { status: params.status }),
    })
  }),

  get: (id) => api.get(`/production/entries/${id}`),

  create: (data) => api.post("/production/entries", {
    productionBatchId: data.productionBatchId,
    operation: data.operation,
    stage: data.stage,
    startedAt: data.startedAt,
    completedAt: data.completedAt || null,
    inputQuantity: data.inputQuantity || 0,
    outputQuantity: data.outputQuantity || 0,
    rejectedQuantity: data.rejectedQuantity || 0,
    unit: data.unit,
    processParameters: data.processParameters || {},
    observations: data.observations || "",
    deviation: data.deviation || "",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// BMR (Batch Manufacturing Records)
// ═══════════════════════════════════════════════════════════════════════════

export const bmrApi = {
  review: (bmrId, data) => api.patch(`/production/bmr/${bmrId}/review`, {
    decision: data.decision, // "Approve" or "Reject"
    remarks: data.remarks || "",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const productionApi = {
  plans: productionPlansApi,
  batches: productionBatchesApi,
  entries: productionEntriesApi,
  bmr: bmrApi,
};

export default productionApi;
