/**
 * InventoryContext.jsx
 * 
 * NEW API-based context to replace localStorage-based GRNContext.
 * Provides centralized state management for inventory operations using backend APIs.
 * 
 * Usage:
 *   import { useInventory } from './context/InventoryContext';
 *   const { purchaseOrders, createPurchaseOrder, ... } = useInventory();
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { inventoryApi, productionApi, qualityApi, finishedGoodsApi } from "../services";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);
  const [stockTransactions, setStockTransactions] = useState([]);
  const [productionBatches, setProductionBatches] = useState([]);
  
  const [loading, setLoading] = useState({
    purchaseOrders: false,
    goodsReceipts: false,
    materials: false,
    suppliers: false,
    stockBalances: false,
  });
  
  const [error, setError] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH FUNCTIONS - Load data from backend
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchPurchaseOrders = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, purchaseOrders: true }));
    setError(null);
    try {
      const response = await inventoryApi.purchaseOrders.list({ limit: 100, ...params });
      setPurchaseOrders(response.items || []);
      return response;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to fetch purchase orders");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, purchaseOrders: false }));
    }
  }, []);

  const fetchGoodsReceipts = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, goodsReceipts: true }));
    setError(null);
    try {
      const response = await inventoryApi.goodsReceipts.list({ limit: 100, ...params });
      setGoodsReceipts(response.items || []);
      return response;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to fetch goods receipts");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, goodsReceipts: false }));
    }
  }, []);

  const fetchMaterials = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, materials: true }));
    setError(null);
    try {
      const response = await inventoryApi.materials.list({ limit: 1000, ...params });
      setMaterials(response.items || []);
      return response;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to fetch materials");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, materials: false }));
    }
  }, []);

  const fetchSuppliers = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, suppliers: true }));
    setError(null);
    try {
      const response = await inventoryApi.suppliers.list({ limit: 1000, ...params });
      setSuppliers(response.items || []);
      return response;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to fetch suppliers");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, suppliers: false }));
    }
  }, []);

  const fetchStockBalances = useCallback(async (params = {}) => {
    setLoading(prev => ({ ...prev, stockBalances: true }));
    setError(null);
    try {
      const response = await inventoryApi.stock.getBalances({ limit: 1000, ...params });
      setStockBalances(response.items || []);
      return response;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to fetch stock balances");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, stockBalances: false }));
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createPurchaseOrder = useCallback(async (data) => {
    try {
      const newPO = await inventoryApi.purchaseOrders.create(data);
      setPurchaseOrders(prev => [newPO, ...prev]);
      return newPO;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to create purchase order");
      throw err;
    }
  }, []);

  const updatePurchaseOrder = useCallback(async (id, data) => {
    try {
      const updated = await inventoryApi.purchaseOrders.update(id, data);
      setPurchaseOrders(prev => prev.map(po => po._id === id ? updated : po));
      return updated;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to update purchase order");
      throw err;
    }
  }, []);

  const approvePurchaseOrder = useCallback(async (id) => {
    try {
      const approved = await inventoryApi.purchaseOrders.approve(id);
      setPurchaseOrders(prev => prev.map(po => po._id === id ? approved : po));
      return approved;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to approve purchase order");
      throw err;
    }
  }, []);

  const cancelPurchaseOrder = useCallback(async (id) => {
    try {
      const cancelled = await inventoryApi.purchaseOrders.cancel(id);
      setPurchaseOrders(prev => prev.map(po => po._id === id ? cancelled : po));
      return cancelled;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to cancel purchase order");
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // GOODS RECEIPTS (GRN)
  // ═══════════════════════════════════════════════════════════════════════════

  const createGoodsReceipt = useCallback(async (data) => {
    try {
      const newGRN = await inventoryApi.goodsReceipts.create(data);
      setGoodsReceipts(prev => [newGRN, ...prev]);
      
      // Refresh related data
      await fetchPurchaseOrders();
      
      return newGRN;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to create goods receipt");
      throw err;
    }
  }, [fetchPurchaseOrders]);

  const updateGoodsReceipt = useCallback(async (id, data) => {
    try {
      const updated = await inventoryApi.goodsReceipts.update(id, data);
      setGoodsReceipts(prev => prev.map(grn => grn._id === id ? updated : grn));
      return updated;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to update goods receipt");
      throw err;
    }
  }, []);

  const changeGRNStatus = useCallback(async (id, status) => {
    try {
      const updated = await inventoryApi.goodsReceipts.changeStatus(id, status);
      setGoodsReceipts(prev => prev.map(grn => grn._id === id ? updated : grn));
      
      // Refresh stock balances when GRN is approved/rejected
      if (["Approved", "Rejected"].includes(status)) {
        await fetchStockBalances();
      }
      
      return updated;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to change GRN status");
      throw err;
    }
  }, [fetchStockBalances]);

  const updateGRNItemStatus = useCallback(async (grnId, itemId, data) => {
    try {
      const updated = await inventoryApi.goodsReceipts.updateItemStatus(grnId, itemId, data);
      setGoodsReceipts(prev => prev.map(grn => grn._id === grnId ? updated : grn));
      return updated;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to update GRN item status");
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const issueToProduction = useCallback(async (data) => {
    try {
      const result = await inventoryApi.stock.issueToProduction(data);
      
      // Refresh stock balances after issuing materials
      await fetchStockBalances();
      
      return result;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to issue materials to production");
      throw err;
    }
  }, [fetchStockBalances]);

  const manualStockIssue = useCallback(async (data) => {
    try {
      const result = await inventoryApi.stock.manualIssue(data);
      
      // Refresh stock balances
      await fetchStockBalances();
      
      return result;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to issue materials");
      throw err;
    }
  }, [fetchStockBalances]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIALS & SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  const createMaterial = useCallback(async (data) => {
    try {
      const newMaterial = await inventoryApi.materials.create(data);
      setMaterials(prev => [newMaterial, ...prev]);
      return newMaterial;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to create material");
      throw err;
    }
  }, []);

  const createSupplier = useCallback(async (data) => {
    try {
      const newSupplier = await inventoryApi.suppliers.create(data);
      setSuppliers(prev => [newSupplier, ...prev]);
      return newSupplier;
    } catch (err) {
      setError(err?.data?.message || err.message || "Failed to create supplier");
      throw err;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const getInventoryByCategory = useCallback((category) => {
    return stockBalances.filter(item => item.category === category && item.usableStock > 0);
  }, [stockBalances]);

  const getRawMaterialInventory = useCallback(() => {
    return getInventoryByCategory("Raw Material");
  }, [getInventoryByCategory]);

  const getPackagingMaterialInventory = useCallback(() => {
    return getInventoryByCategory("Packaging Material");
  }, [getInventoryByCategory]);

  const getFinishedGoodsInventory = useCallback(() => {
    return getInventoryByCategory("Finished Goods");
  }, [getInventoryByCategory]);

  const getInventorySummaryByCategory = useCallback(() => {
    const summary = {
      "Raw Material": { count: 0, totalQty: 0, items: [] },
      "Packaging Material": { count: 0, totalQty: 0, items: [] },
      "Finished Goods": { count: 0, totalQty: 0, items: [] },
    };

    stockBalances.forEach((item) => {
      if (item.usableStock > 0 && summary[item.category]) {
        summary[item.category].count++;
        summary[item.category].totalQty += item.usableStock;
        summary[item.category].items.push(item);
      }
    });

    return summary;
  }, [stockBalances]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL DATA LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Load initial data when component mounts
    const loadInitialData = async () => {
      try {
        await Promise.allSettled([
          fetchMaterials(),
          fetchSuppliers(),
          fetchPurchaseOrders(),
          fetchGoodsReceipts(),
          fetchStockBalances(),
        ]);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════════════

  const value = {
    // State
    purchaseOrders,
    goodsReceipts,
    materials,
    suppliers,
    stockBalances,
    stockTransactions,
    productionBatches,
    loading,
    error,
    
    // Fetch functions
    fetchPurchaseOrders,
    fetchGoodsReceipts,
    fetchMaterials,
    fetchSuppliers,
    fetchStockBalances,
    
    // Purchase Orders
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    cancelPurchaseOrder,
    
    // Goods Receipts
    createGoodsReceipt,
    updateGoodsReceipt,
    changeGRNStatus,
    updateGRNItemStatus,
    
    // Stock operations
    issueToProduction,
    manualStockIssue,
    
    // Materials & Suppliers
    createMaterial,
    createSupplier,
    
    // Computed values
    getInventoryByCategory,
    getRawMaterialInventory,
    getPackagingMaterialInventory,
    getFinishedGoodsInventory,
    getInventorySummaryByCategory,
    
    // Backward compatibility aliases (for gradual migration from GRNContext)
    grns: goodsReceipts,
    createGRN: createGoodsReceipt,
    updateGRN: updateGoodsReceipt,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

/**
 * Hook to access inventory context
 * @throws {Error} if used outside InventoryProvider
 */
export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used inside InventoryProvider");
  }
  return context;
}
