/**
 * finishedGoodsApi.js
 * API service for finished goods and dispatch
 */

import api from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════
// FINISHED GOODS
// ═══════════════════════════════════════════════════════════════════════════

export const finishedGoodsApi = {
  list: (params = {}) => api.get("/finished-goods", {
    params: new URLSearchParams({
      ...(params.status && { status: params.status }),
      ...(params.productCode && { productCode: params.productCode }),
    })
  }),

  get: (id) => api.get(`/finished-goods/${id}`),

  create: (batchId) => api.post("/finished-goods", {
    productionBatchId: batchId,
  }),

  release: (id) => api.patch(`/finished-goods/${id}/release`),
};

// ═══════════════════════════════════════════════════════════════════════════
// DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

export const dispatchApi = {
  list: (params = {}) => api.get("/dispatch", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.status && { status: params.status }),
      ...(params.finishedGoodsId && { finishedGoodsId: params.finishedGoodsId }),
      ...(params.customerName && { customerName: params.customerName }),
    })
  }),

  get: (id) => api.get(`/dispatch/${id}`),

  create: (data) => api.post("/dispatch", {
    finishedGoodsId: data.finishedGoodsId,
    quantity: data.quantity,
    customerName: data.customerName,
    destination: data.destination || "",
    referenceNumber: data.referenceNumber || "",
    notes: data.notes || "",
  }),

  directDispatch: (data) => api.post("/dispatch/direct", {
    finishedGoodsId: data.finishedGoodsId,
    quantity: data.quantity,
    destination: data.destination,
    customerName: data.customerName || "",
    referenceNumber: data.referenceNumber || "",
    notes: data.notes || "",
    dispatchDate: data.dispatchDate || undefined,
  }),

  confirm: (id) => api.patch(`/dispatch/${id}/confirm`),

  cancel: (id, reason) => api.patch(`/dispatch/${id}/cancel`, { reason }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const finishedGoodsFullApi = {
  finishedGoods: finishedGoodsApi,
  dispatch: dispatchApi,
};

export default finishedGoodsFullApi;
