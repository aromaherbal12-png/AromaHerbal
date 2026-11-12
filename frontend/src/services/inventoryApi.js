/**
 * inventoryApi.js
 * API service for inventory, materials, suppliers, purchase orders, and GRNs
 * 
 * This replaces the localStorage-based GRNContext with real backend API calls.
 */

import api from "./api.js";

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════════════════════

export const materialsApi = {
  /**
   * List all materials with optional filters
   * @param {Object} params - { search, active, page, limit }
   */
  list: (params = {}) => api.get("/inventory/materials", { 
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.search && { search: params.search }),
      ...(params.active !== undefined && { active: params.active }),
    })
  }),

  /**
   * Get a single material by ID
   */
  get: (id) => api.get(`/inventory/materials/${id}`),

  /**
   * Create a new material
   */
  create: (data) => api.post("/inventory/materials", {
    materialCode: data.materialCode,
    name: data.name,
    category: data.category,
    description: data.description || "",
    unit: data.unit,
    reorderLevel: data.reorderLevel || 0,
  }),

  /**
   * Update an existing material
   */
  update: (id, data) => api.patch(`/inventory/materials/${id}`, data),

  /**
   * Deactivate a material
   */
  deactivate: (id) => api.patch(`/inventory/materials/${id}/deactivate`),
};

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════

export const suppliersApi = {
  /**
   * List all suppliers
   */
  list: (params = {}) => api.get("/inventory/suppliers", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.search && { search: params.search }),
      ...(params.active !== undefined && { active: params.active }),
    })
  }),

  /**
   * Get a single supplier by ID
   */
  get: (id) => api.get(`/inventory/suppliers/${id}`),

  /**
   * Create a new supplier
   */
  create: (data) => api.post("/inventory/suppliers", {
    supplierCode: data.supplierCode,
    name: data.name,
    contactPerson: data.contactPerson || "",
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || "",
    taxId: data.taxId || "",
    notes: data.notes || "",
  }),

  /**
   * Update an existing supplier
   */
  update: (id, data) => api.patch(`/inventory/suppliers/${id}`, data),

  /**
   * Deactivate a supplier
   */
  deactivate: (id) => api.patch(`/inventory/suppliers/${id}/deactivate`),
};

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════════════

export const purchaseOrdersApi = {
  /**
   * List purchase orders with optional filters
   */
  list: (params = {}) => api.get("/inventory/purchase-orders", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 100,
      ...(params.status && { status: params.status }),
      ...(params.supplierId && { supplierId: params.supplierId }),
      ...(params.search && { search: params.search }),
    })
  }),

  /**
   * Get a single purchase order by ID
   */
  get: (id) => api.get(`/inventory/purchase-orders/${id}`),

  /**
   * Create a new purchase order
   */
  create: (data) => api.post("/inventory/purchase-orders", {
    supplierId: data.supplierId,
    items: data.items.map(item => ({
      materialId: item.materialId || item.material,
      orderedQty: item.orderedQty || item.quantity,
      unitPrice: item.unitPrice || item.rate || 0,
      gstRate: item.gstRate || 18,
    })),
    expectedDeliveryDate: data.expectedDeliveryDate || data.expectedDate || null,
    notes: data.notes || "",
  }),

  /**
   * Update a purchase order (draft only)
   */
  update: (id, data) => api.patch(`/inventory/purchase-orders/${id}`, data),

  /**
   * Approve a purchase order
   */
  approve: (id) => api.patch(`/inventory/purchase-orders/${id}/approve`),

  /**
   * Cancel a purchase order
   */
  cancel: (id) => api.patch(`/inventory/purchase-orders/${id}/cancel`),

  /**
   * Mark a PO item as complete (manually mark as fully received)
   */
  toggleItemCompletion: (poId, itemId, isComplete) => 
    api.patch(`/inventory/purchase-orders/${poId}/items/${itemId}/completion`, {
      isComplete,
    }),
};

// ═══════════════════════════════════════════════════════════════════════════
// GOODS RECEIPTS (GRN)
// ═══════════════════════════════════════════════════════════════════════════

export const goodsReceiptsApi = {
  /**
   * List goods receipts with optional filters
   */
  list: (params = {}) => api.get("/inventory/goods-receipts", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 100,
      ...(params.status && { status: params.status }),
      ...(params.purchaseOrderId && { purchaseOrderId: params.purchaseOrderId }),
      ...(params.supplierId && { supplierId: params.supplierId }),
      ...(params.search && { search: params.search }),
    })
  }),

  /**
   * Get a single goods receipt by ID
   */
  get: (id) => api.get(`/inventory/goods-receipts/${id}`),

  /**
   * Create a new goods receipt (GRN)
   */
  create: (data) => api.post("/inventory/goods-receipts", {
    purchaseOrderId: data.purchaseOrderId,
    items: data.items.map(item => ({
      material: item.materialId || item.material,
      receivedQty: item.receivedQty || item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      orderedQty: item.orderedQty,
      receivedDate: item.receivedDate || new Date().toISOString(),
      batchNumber: item.batchNumber || "",
      invoiceChallan: item.invoiceChallan || "",
      expiryDate: item.expiryDate || null,
      notes: item.notes || "",
    })),
    supplierDeliveryNumber: data.supplierDeliveryNumber || "",
    receivedAt: data.receivedAt || new Date().toISOString(),
    notes: data.notes || "",
    isDraft: data.isDraft || false,
  }),

  /**
   * Update a goods receipt (pending status only)
   */
  update: (id, data) => api.patch(`/inventory/goods-receipts/${id}`, {
    items: data.items,
    notes: data.notes,
    supplierDeliveryNumber: data.supplierDeliveryNumber,
    isDraft: data.isDraft,
  }),

  /**
   * Change GRN status (e.g., Pending → Quarantined → Under Testing → Approved/Rejected)
   */
  changeStatus: (id, status) => 
    api.patch(`/inventory/goods-receipts/${id}/status`, { status }),

  /**
   * Update individual GRN item quality status
   */
  updateItemStatus: (grnId, itemId, data) =>
    api.patch(`/inventory/goods-receipts/${grnId}/items/${itemId}/status`, {
      qualityStatus: data.qualityStatus,
      rejectionReason: data.rejectionReason || "",
    }),
};

// ═══════════════════════════════════════════════════════════════════════════
// STOCK & INVENTORY
// ═══════════════════════════════════════════════════════════════════════════

export const stockApi = {
  /**
   * Get stock balances for all materials
   */
  getBalances: (params = {}) => api.get("/inventory/stock-balances", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 100,
      ...(params.materialId && { materialId: params.materialId }),
      ...(params.search && { search: params.search }),
    })
  }),

  /**
   * List all stock transactions
   */
  listTransactions: (params = {}) => api.get("/inventory/stock-transactions", {
    params: new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 50,
      ...(params.materialId && { materialId: params.materialId }),
      ...(params.stockBucket && { stockBucket: params.stockBucket }),
      ...(params.transactionType && { transactionType: params.transactionType }),
      ...(params.search && { search: params.search }),
    })
  }),

  /**
   * Issue materials to production
   */
  issueToProduction: (data) => api.post("/inventory/production-issues", {
    productionBatchId: data.productionBatchId,
    items: data.items.map(item => ({
      materialId: item.materialId,
      quantity: item.quantity,
      batchNumber: item.batchNumber || "",
      remarks: item.remarks || "",
    })),
    remarks: data.remarks || "",
  }),

  /**
   * Manual stock issue (ad-hoc deduction without production batch)
   */
  manualIssue: (data) => api.post("/inventory/stock-transactions/manual-issue", {
    items: data.items.map(item => ({
      materialId: item.materialId,
      quantity: item.quantity,
      batchNumber: item.batchNumber || "",
      remarks: item.remarks || "",
    })),
    remarks: data.remarks || "",
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT - Unified Inventory API
// ═══════════════════════════════════════════════════════════════════════════

const inventoryApi = {
  materials: materialsApi,
  suppliers: suppliersApi,
  purchaseOrders: purchaseOrdersApi,
  goodsReceipts: goodsReceiptsApi,
  stock: stockApi,
};

export default inventoryApi;
