import { useMemo, useState, useEffect } from "react";
import { useGRNs } from "../context/GRNContext.jsx";
import PurchaseOrderForm from "./PurchaseOrderForm.jsx";
import StoreInventory from "./StoreInventory.jsx";
import DispatchForm from "./DispatchForm.jsx";
import api from "../services/api.js";

const money = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v) || 0);

export default function StoreGRNs({ user }) {
  const { grns, purchaseOrders, inventoryMovements, notifications } = useGRNs();
  const [activeTab, setActiveTab] = useState("purchase-order");

  const lowStockAlerts = notifications.filter((n) => n.type === "low-stock" && n.active).length;

  return (
    <>
      <div className="store-page-tabs" role="tablist" aria-label="Store Incharge pages">
        <button type="button" role="tab" aria-selected={activeTab === "purchase-order"} className={activeTab === "purchase-order" ? "active" : ""} onClick={() => setActiveTab("purchase-order")}>
          Purchase Order &amp; GRN
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "inventory"} className={activeTab === "inventory" ? "active" : ""} onClick={() => setActiveTab("inventory")}>
          Inventory Management
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "report"} className={activeTab === "report" ? "active" : ""} onClick={() => setActiveTab("report")}>
          Inventory Report{lowStockAlerts > 0 && <span className="tab-badge tab-badge-warn">{lowStockAlerts}</span>}
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "dispatch"} className={activeTab === "dispatch" ? "active" : ""} onClick={() => setActiveTab("dispatch")}>
          Dispatch Form
        </button>
      </div>

      {/* ── Purchase Order + GRN tab (combined) ── */}
      <div style={{ display: activeTab === "purchase-order" ? "block" : "none" }}>
        <PurchaseOrderForm user={user} />
      </div>

      {/* ── Inventory Management tab ── */}
      <div style={{ display: activeTab === "inventory" ? "block" : "none" }}>
        <StoreInventory />
      </div>

      {/* ── Inventory Report tab ── */}
      <div style={{ display: activeTab === "report" ? "block" : "none" }}>
        <InventoryReport grns={grns} inventoryMovements={inventoryMovements} notifications={notifications} purchaseOrders={purchaseOrders} />
      </div>

      {/* ── Dispatch Form tab ── */}
      <div style={{ display: activeTab === "dispatch" ? "block" : "none" }}>
        <DispatchForm user={user} />
      </div>
    </>
  );
}

function InventoryReport({ grns, inventoryMovements, notifications, purchaseOrders }) {
  const [reportSection, setReportSection] = useState("current-stock");

  const approvedInStock = grns.filter((r) => r.status === "Approved" && r.inventoryStatus === "In Stock");
  const lowStockAlerts = notifications.filter((n) => n.type === "low-stock" && n.active);

  // Group approved in-stock items by product key
  const stockMap = useMemo(() => {
    const map = new Map();
    approvedInStock.forEach((r) => {
      const key = `${String(r.category || "").trim().toLowerCase()}::${String(r.material || "").trim().toLowerCase()}::${String(r.unit || "").trim().toLowerCase()}`;
      const entry = map.get(key) || { material: r.material, category: r.category, unit: r.unit, availableQty: 0, receivedQty: 0, locations: new Set(), suppliers: new Set(), qcNos: new Set() };
      entry.availableQty += Number(r.availableQty) || 0;
      entry.receivedQty += Number(r.receivedQty) || 0;
      if (r.storageLocation) entry.locations.add(r.storageLocation);
      if (r.supplier) entry.suppliers.add(r.supplier);
      if (r.qcNo) entry.qcNos.add(r.qcNo);
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => a.material.localeCompare(b.material));
  }, [approvedInStock]);

  // Reorder list: items where availableQty < threshold (from notifications)
  const reorderList = useMemo(() => lowStockAlerts.map((n) => ({
    material: n.material,
    unit: n.unit,
    available: n.quantity,
    threshold: n.threshold,
    deficit: Math.max(0, n.threshold - n.quantity),
  })), [lowStockAlerts]);

  // Stock in / out summary
  const stockIn = inventoryMovements.filter((m) => m.type === "Stock In");
  const stockOut = inventoryMovements.filter((m) => m.type === "Stock Out");
  const totalStockIn = stockIn.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const totalStockOut = stockOut.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const totalStockInValue = stockIn.reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const totalStockOutValue = stockOut.reduce((s, m) => s + (Number(m.amount) || 0), 0);

  // Material usage (stock-out by material)
  const usageMap = useMemo(() => {
    const map = new Map();
    stockOut.forEach((m) => {
      const key = `${m.material}::${m.unit}`;
      const entry = map.get(key) || { material: m.material, unit: m.unit, totalQty: 0, totalAmount: 0, count: 0 };
      entry.totalQty += Number(m.quantity) || 0;
      entry.totalAmount += Number(m.amount) || 0;
      entry.count += 1;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
  }, [stockOut]);

  const totalCurrentStock = stockMap.reduce((s, r) => s + r.availableQty, 0);
  const totalPOValue = purchaseOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

  const subTabs = [
    { id: "current-stock", label: "Current Stock" },
    { id: "stock-movements", label: "Stock In / Out" },
    { id: "low-stock", label: `Low Stock (${lowStockAlerts.length})` },
    { id: "reorder", label: "Reorder List" },
    { id: "material-usage", label: "Material Usage" },
  ];

  return (
    <section className="panel workflow-panel">
      <span className="eyebrow">STORE INCHARGE</span>
      <h2>Inventory Report</h2>
      <p className="muted">Live view of stock levels, movements, low-stock alerts, reorder requirements, and material usage across all approved GRNs.</p>

      {/* KPI summary strip */}
      <div className="report-kpi-strip">
        <KPI label="Total stock items" value={stockMap.length} />
        <KPI label="Total available units" value={totalCurrentStock.toLocaleString("en-IN")} />
        <KPI label="Low stock alerts" value={lowStockAlerts.length} warn={lowStockAlerts.length > 0} />
        <KPI label="Stock In (units)" value={totalStockIn.toLocaleString("en-IN")} />
        <KPI label="Stock Out (units)" value={totalStockOut.toLocaleString("en-IN")} />
        <KPI label="Total PO value" value={money(totalPOValue)} />
      </div>

      {/* Sub-navigation */}
      <div className="report-sub-tabs">
        {subTabs.map((t) => (
          <button key={t.id} type="button" className={reportSection === t.id ? "active" : ""} onClick={() => setReportSection(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Current Stock */}
      {reportSection === "current-stock" && (
        <div>
          <div className="section-heading" style={{ marginTop: 18 }}><h3>Current Stock</h3><span>{stockMap.length} products in stock</span></div>
          {stockMap.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Material</th><th>Category</th><th>Available Qty</th><th>Unit</th>
                    <th>Storage Location(s)</th><th>Supplier(s)</th><th>QC No(s).</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMap.map((row, i) => (
                    <tr key={i}>
                      <td><b>{row.material}</b></td>
                      <td>{row.category}</td>
                      <td><b>{row.availableQty}</b></td>
                      <td>{row.unit}</td>
                      <td>{[...row.locations].join(", ") || "—"}</td>
                      <td>{[...row.suppliers].join(", ") || "—"}</td>
                      <td>{[...row.qcNos].join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">No approved stock available. GRNs must be approved and stored first.</p>}
        </div>
      )}

      {/* Stock In / Out */}
      {reportSection === "stock-movements" && (
        <div>
          <div className="report-movement-summary">
            <div className="movement-card in">
              <small>Total Stock In</small>
              <b>{totalStockIn.toLocaleString("en-IN")} units</b>
              <span>{money(totalStockInValue)}</span>
              <span className="movement-count">{stockIn.length} movements</span>
            </div>
            <div className="movement-card out">
              <small>Total Stock Out</small>
              <b>{totalStockOut.toLocaleString("en-IN")} units</b>
              <span>{money(totalStockOutValue)}</span>
              <span className="movement-count">{stockOut.length} movements</span>
            </div>
          </div>
          <div className="section-heading" style={{ marginTop: 20 }}><h3>All Stock Movements</h3><span>{inventoryMovements.length} records</span></div>
          {inventoryMovements.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Reference</th><th>Type</th><th>Material</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Value</th><th>Reason</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {inventoryMovements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>{m.id}</td>
                      <td><span style={{ color: m.type === "Stock In" ? "#27603b" : "#a3332b", fontWeight: 700, fontSize: 12 }}>{m.type}</span></td>
                      <td>{m.material}</td>
                      <td>{m.category}</td>
                      <td><b>{m.quantity}</b></td>
                      <td>{m.unit}</td>
                      <td>{m.amount ? money(m.amount) : "—"}</td>
                      <td style={{ maxWidth: 200, whiteSpace: "normal" }}>{m.reason || "—"}</td>
                      <td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">No stock movements recorded yet.</p>}
        </div>
      )}

      {/* Low Stock */}
      {reportSection === "low-stock" && (
        <div>
          <div className="section-heading" style={{ marginTop: 18 }}><h3>Low Stock Alerts</h3><span>{lowStockAlerts.length} active</span></div>
          {lowStockAlerts.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Material</th><th>Available</th><th>Unit</th><th>Reorder Threshold</th><th>Deficit</th><th>Alert Created</th></tr></thead>
                <tbody>
                  {lowStockAlerts.map((n) => (
                    <tr key={n.id}>
                      <td><b>{n.material}</b></td>
                      <td style={{ color: "#a3332b", fontWeight: 700 }}>{n.quantity}</td>
                      <td>{n.unit}</td>
                      <td>{n.threshold}</td>
                      <td style={{ color: "#a3332b", fontWeight: 700 }}>{Math.max(0, n.threshold - n.quantity)}</td>
                      <td>{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state" style={{ background: "#eef7ee", color: "#27603b" }}>No products are below their reorder threshold. Stock levels are healthy.</p>}
        </div>
      )}

      {/* Reorder List */}
      {reportSection === "reorder" && (
        <div>
          <div className="section-heading" style={{ marginTop: 18 }}><h3>Reorder List</h3><span>{reorderList.length} items need restocking</span></div>
          <p className="muted" style={{ marginBottom: 14 }}>Items currently below their configured low-stock threshold. Use this list to raise purchase orders.</p>
          {reorderList.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Material</th><th>Available</th><th>Unit</th><th>Reorder Threshold</th><th>Qty to Order</th></tr></thead>
                <tbody>
                  {reorderList.map((row, i) => (
                    <tr key={i}>
                      <td><b>{row.material}</b></td>
                      <td style={{ color: "#a3332b", fontWeight: 700 }}>{row.available}</td>
                      <td>{row.unit}</td>
                      <td>{row.threshold}</td>
                      <td><b style={{ color: "#27603b" }}>{row.deficit} {row.unit}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state" style={{ background: "#eef7ee", color: "#27603b" }}>No reorder required at this time.</p>}
        </div>
      )}

      {/* Material Usage */}
      {reportSection === "material-usage" && (
        <div>
          <div className="section-heading" style={{ marginTop: 18 }}><h3>Material Usage</h3><span>Aggregated Stock Out transactions</span></div>
          <p className="muted" style={{ marginBottom: 14 }}>Total quantities issued from store — from production material issues and manual stock-out transactions.</p>
          {usageMap.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Material</th><th>Unit</th><th>Total Qty Used</th><th>Total Value</th><th>No. of Issues</th></tr></thead>
                <tbody>
                  {usageMap.map((row, i) => (
                    <tr key={i}>
                      <td><b>{row.material}</b></td>
                      <td>{row.unit}</td>
                      <td><b>{row.totalQty.toLocaleString("en-IN")}</b></td>
                      <td>{money(row.totalAmount)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">No material usage recorded yet. Stock-out transactions will appear here.</p>}
          {/* Recent individual movements */}
          <div className="section-heading" style={{ marginTop: 26 }}><h3>Recent Issues</h3><span>Last {Math.min(stockOut.length, 20)} records</span></div>
          {stockOut.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Reference</th><th>Material</th><th>Qty</th><th>Unit</th><th>Reason</th><th>Issued By</th><th>Date</th></tr></thead>
                <tbody>
                  {stockOut.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>{m.id}</td>
                      <td>{m.material}</td>
                      <td><b>{m.quantity}</b></td>
                      <td>{m.unit}</td>
                      <td style={{ maxWidth: 200, whiteSpace: "normal" }}>{m.reason || "—"}</td>
                      <td>{m.user || "—"}</td>
                      <td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
function DetailRow({ label, value }) {
  return (
    <div className="grn-detail-row">
      <span className="grn-detail-label">{label}</span>
      <span className="grn-detail-value">{value}</span>
    </div>
  );
}

function KPI({ label, value, warn = false }) {
  return (
    <div className={`report-kpi-card${warn ? " warn" : ""}`}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
