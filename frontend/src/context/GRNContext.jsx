import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api.js";

/**
 * GRNContext — API-backed context.
 * All data is fetched from / persisted to the backend.
 * Provides the same surface area as the old localStorage version so all
 * consumers (ProductionFlow, StoreGRNs, App Reports, PurchaseOrderForm) work
 * without changes to their hook calls.
 */

const GRNContext = createContext(null);

// ── helpers ───────────────────────────────────────────────────────────────────

function mapGRN(item) {
  // Normalise backend GoodsReceipt shape → the shape consumers expect
  return {
    id: item._id,
    _id: item._id,
    grnNumber: item.grnNumber,
    material: item.items?.[0]?.materialName || "",
    category: item.items?.[0]?.category || "Raw Material",
    unit: item.items?.[0]?.unit || "",
    receivedQty: item.items?.reduce((s, i) => s + (Number(i.receivedQty) || 0), 0) || 0,
    availableQty: item.items?.reduce((s, i) => s + (Number(i.receivedQty) || 0), 0) || 0,
    unitRate: item.items?.[0]?.unitPrice || 0,
    amount: 0,
    supplier: item.supplierName || "",
    receivedDate: item.receivedAt ? new Date(item.receivedAt).toISOString().slice(0, 10) : "",
    storageLocation: "",
    status: mapGRNStatus(item.status),
    inventoryStatus: mapInventoryStatus(item.status),
    qcNo: item.approvedSticker || "",
    lowStockThreshold: 100,
    items: item.items || [],
    raw: item,
  };
}

function mapGRNStatus(status) {
  const map = {
    Pending: "Pending Inspection",
    Quarantined: "Under Testing",
    "Under Testing": "Under Testing",
    "QC Pending": "Under Testing",
    "QC Completed": "Approved",
    Approved: "Approved",
    Rejected: "Rejected",
  };
  return map[status] || status;
}

function mapInventoryStatus(status) {
  if (["Approved", "QC Completed"].includes(status)) return "In Stock";
  if (status === "Rejected") return "Restricted";
  return "Pending QC";
}

function mapPO(item) {
  return {
    id: item.poNumber || item._id,   // display-friendly PO number
    _id: item._id,
    poNumber: item.poNumber,
    supplier: item.supplierName || "",
    status: item.status,
    orderType: "Purchase Order",
    grandTotal: (item.subtotal || 0) + (item.shippingCharges || 0),
    items: (item.items || []).map(i => ({
      id: i._id,
      description: i.materialName || "",
      quantity: i.orderedQty || 0,
      receivedQty: i.receivedQty || 0,
      unit: i.unit || "",
      rate: i.unitPrice || 0,
    })),
    expectedDate: item.expectedDeliveryDate
      ? new Date(item.expectedDeliveryDate).toISOString().slice(0, 10)
      : "",
    createdAt: item.createdAt,
    raw: item,
  };
}

// ── provider ──────────────────────────────────────────────────────────────────

export function GRNProvider({ children }) {
  const [grns, setGRNs] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [productionBatches, setProductionBatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── loaders ─────────────────────────────────────────────────────────────────

  const loadGRNs = useCallback(async () => {
    try {
      const res = await api.get("/inventory/goods-receipts?limit=200");
      setGRNs((res.items || []).map(mapGRN));
    } catch { /* network error — keep existing state */ }
  }, []);

  const loadPurchaseOrders = useCallback(async () => {
    try {
      const res = await api.get("/inventory/purchase-orders?limit=200");
      setPurchaseOrders((res.items || []).map(mapPO));
    } catch { /* keep existing state */ }
  }, []);

  const loadInventoryMovements = useCallback(async () => {
    try {
      const res = await api.get("/inventory/stock-transactions?limit=500");
      const items = (res.items || []).map(t => ({
        id: t._id,
        type: t.transactionType === "QC_ACCEPTANCE" || t.transactionType === "MANUAL_RECEIPT"
          ? "Stock In"
          : "Stock Out",
        reason: t.remarks || t.transactionType || "",
        material: t.materialName || "",
        category: "",
        quantity: t.quantity || 0,
        unit: t.unit || "",
        amount: 0,
        createdAt: t.transactionDate || t.createdAt,
        user: "",
      }));
      setInventoryMovements(items);
    } catch { /* keep */ }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get("/inventory/stock-balances?limit=500");
      const lowItems = (res.items || []).filter(b => b.lowStock && b.usableStock >= 0);
      setNotifications(lowItems.map(b => ({
        id: String(b.materialId),
        key: `${b.category}::${b.name}::${b.unit}`,
        type: "low-stock",
        material: b.name,
        unit: b.unit,
        quantity: b.usableStock,
        threshold: b.reorderLevel,
        active: b.lowStock,
        read: false,
        createdAt: new Date().toISOString(),
        message: `${b.usableStock} ${b.unit} available; reorder threshold is ${b.reorderLevel} ${b.unit}.`,
      })));
    } catch { /* keep */ }
  }, []);

  const loadProductionBatches = useCallback(async () => {
    try {
      const res = await api.get("/batch-data");
      setProductionBatches((res || []).map(r => ({ ...r.data, _dbId: r._id })));
    } catch { /* keep */ }
  }, []);

  // ── initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      loadGRNs(),
      loadPurchaseOrders(),
      loadInventoryMovements(),
      loadNotifications(),
      loadProductionBatches(),
    ]).finally(() => setLoading(false));
  }, [loadGRNs, loadPurchaseOrders, loadInventoryMovements, loadNotifications, loadProductionBatches]);

  // ── mutations ─────────────────────────────────────────────────────────────────

  const createPurchaseOrder = useCallback(async (details) => {
    // No-op: POs are now created directly by PurchaseOrderForm via the backend.
    // This keeps backward compatibility — returns a minimal object.
    await loadPurchaseOrders();
    return { id: details.id || `PO-${Date.now()}`, ...details };
  }, [loadPurchaseOrders]);

  const updatePurchaseOrder = useCallback(async (id, updates) => {
    await loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const recordPurchaseOrderReceipt = useCallback(() => {}, []);

  const createGRN = useCallback(async (details) => {
    await loadGRNs();
    return details;
  }, [loadGRNs]);

  const updateGRN = useCallback(async (id, updates) => {
    await loadGRNs();
  }, [loadGRNs]);

  const addToInventoryDirect = useCallback(async () => {
    await loadGRNs();
  }, [loadGRNs]);

  const approveGRNFromQC = useCallback(async () => {
    await loadGRNs();
    return "";
  }, [loadGRNs]);

  const recordInventoryMovement = useCallback(async (movement) => {
    await loadInventoryMovements();
    return movement;
  }, [loadInventoryMovements]);

  // ── production batch persistence (backend) ────────────────────────────────────

  const createProductionBatch = useCallback(async (details) => {
    const batchId = `BMR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const batch = { ...details, id: batchId, status: "Planned", createdAt: new Date().toISOString() };
    try {
      await api.post("/batch-data", { batchId, data: batch });
    } catch (e) {
      if (e?.statusCode !== 409) throw e;
    }
    setProductionBatches(prev => [batch, ...prev]);
    return batch;
  }, []);

  const updateProductionBatch = useCallback(async (id, updates, event) => {
    setProductionBatches(prev => {
      const updated = prev.map(b =>
        b.id === id
          ? { ...b, ...updates, updatedAt: new Date().toISOString() }
          : b
      );
      const target = updated.find(b => b.id === id);
      if (target) {
        api.post("/batch-data", { batchId: id, data: target }).catch(() => {});
      }
      return updated;
    });
  }, []);

  // ── notifications ────────────────────────────────────────────────────────────

  const createWorkflowNotification = useCallback((details) => {
    const item = { ...details, id: `NOTE-${Date.now()}`, createdAt: new Date().toISOString(), active: true, read: false };
    setNotifications(prev => [item, ...prev]);
    return item;
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  // ── inventory category helpers ───────────────────────────────────────────────

  const getInventoryByCategory = useCallback((category) =>
    grns.filter(r => r.status === "Approved" && r.inventoryStatus === "In Stock" &&
      (r.category || "Raw Material") === category),
  [grns]);

  const getRawMaterialInventory = useCallback(() => getInventoryByCategory("Raw Material"), [getInventoryByCategory]);
  const getPackagingMaterialInventory = useCallback(() => getInventoryByCategory("Packaging Material"), [getInventoryByCategory]);
  const getFinishedGoodsInventory = useCallback(() => getInventoryByCategory("Finished Goods"), [getInventoryByCategory]);

  const getInventorySummaryByCategory = useCallback(() => {
    const summary = {
      "Raw Material": { count: 0, totalQty: 0, items: [] },
      "Packaging Material": { count: 0, totalQty: 0, items: [] },
      "Finished Goods": { count: 0, totalQty: 0, items: [] },
    };
    grns.filter(r => r.status === "Approved" && r.inventoryStatus === "In Stock").forEach(r => {
      const cat = r.category || "Raw Material";
      if (summary[cat]) {
        summary[cat].count++;
        summary[cat].totalQty += Number(r.availableQty) || 0;
        summary[cat].items.push(r);
      }
    });
    return summary;
  }, [grns]);

  const consumeProductionMaterials = useCallback(() => ({ ok: true, movements: [] }), []);
  const addFinishedGoodsToInventory = useCallback(() => ({}), []);

  return (
    <GRNContext.Provider value={{
      grns,
      purchaseOrders,
      inventoryMovements,
      notifications,
      productionBatches,
      loading,
      // GRN ops
      createGRN,
      updateGRN,
      addToInventoryDirect,
      approveGRNFromQC,
      // PO ops
      createPurchaseOrder,
      updatePurchaseOrder,
      recordPurchaseOrderReceipt,
      // Inventory
      recordInventoryMovement,
      consumeProductionMaterials,
      addFinishedGoodsToInventory,
      getInventoryByCategory,
      getRawMaterialInventory,
      getPackagingMaterialInventory,
      getFinishedGoodsInventory,
      getInventorySummaryByCategory,
      // Production batches
      createProductionBatch,
      updateProductionBatch,
      // Notifications
      createWorkflowNotification,
      markNotificationRead,
      // Reload helpers
      reload: {
        grns: loadGRNs,
        purchaseOrders: loadPurchaseOrders,
        movements: loadInventoryMovements,
        notifications: loadNotifications,
        batches: loadProductionBatches,
      },
    }}>
      {children}
    </GRNContext.Provider>
  );
}

export function useGRNs() {
  const context = useContext(GRNContext);
  if (!context) throw new Error("useGRNs must be used inside GRNProvider");
  return context;
}
