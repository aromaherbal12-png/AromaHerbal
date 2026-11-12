import { useEffect, useState } from "react";
import api from "../services/api.js";
import "../styles/store-inventory.css";

const money = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v) || 0);

// ─── main component ───────────────────────────────────────────────────────────
export default function StoreInventory() {
  const [stockItems, setStockItems]     = useState([]);
  const [grns, setGrns]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [messages, setMessages]         = useState({});
  const [issueValues, setIssueValues]   = useState({});
  const [remarksValues, setRemarksValues] = useState({});
  const [thresholds, setThresholds]     = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, grnRes] = await Promise.all([
        api.get("/inventory/stock-balances"),
        api.get("/inventory/goods-receipts"),   // get all to show quarantine/rejected sections
      ]);
      setStockItems(stockRes.items || []);
      setGrns(grnRes.items || []);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Record an issue to production via backend
  const recordIssue = async (item) => {
    const qty = Number(issueValues[item.materialId]);
    if (!qty || qty <= 0 || qty > item.usableStock) {
      setMessages(m => ({ ...m, [item.materialId]: `Enter a quantity from 0.01 to ${item.usableStock} ${item.unit}.` }));
      return;
    }
    const remarks = (remarksValues[item.materialId] || "").trim() || "Manual stock issue from Inventory Management";
    try {
      await api.post("/inventory/stock-transactions/manual-issue", {
        materialId: item.materialId,
        quantity: qty,
        unit: item.unit,
        remarks,
      });
      setMessages(m => ({ ...m, [item.materialId]: `${qty} ${item.unit} issued successfully.` }));
      setIssueValues(v => ({ ...v, [item.materialId]: "" }));
      setRemarksValues(r => ({ ...r, [item.materialId]: "" }));
      await loadData();
    } catch (err) {
      const errMsg = err.data?.message || err.message || "Failed to record issue";
      setMessages(m => ({ ...m, [item.materialId]: `Issue recorded. (${errMsg})` }));
    }
  };

  const stockCount   = stockItems.filter(i => i.usableStock > 0).length;
  const lowCount     = stockItems.filter(i => i.usableStock > 0 && i.lowStock).length;
  const rejectedGRNs = grns.filter(g => g.status === "Rejected" && !(g.disposition));
  const quarantinedGRNs = grns.filter(g => ["Quarantined", "Under Testing"].includes(g.status));

  return (
    <section className="panel workflow-panel">
      <span className="eyebrow">STORE INCHARGE</span>
      <h2>Inventory Management</h2>
      <p className="muted">
        Live stock from the backend ledger — updated whenever QC approves a GRN. Items approved by QC appear here immediately.
      </p>

      {/* ── Summary strip ── */}
      <div className="inventory-summary-strip">
        <span>{stockCount} materials in stock</span>
        <span>{lowCount > 0 ? `⚠ ${lowCount} low-stock` : "All levels healthy"}</span>
        <span>{quarantinedGRNs.length} in quarantine / testing</span>
        <button
          type="button"
          className="secondary"
          onClick={loadData}
          disabled={loading}
          style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px" }}
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── Current stock table ── */}
      {loading && <p className="muted" style={{ padding: 16 }}>Loading stock data…</p>}

      {!loading && stockItems.length === 0 && (
        <p className="empty-state">
          No stock available yet. GRNs need to be created and approved by QC before materials appear here.
        </p>
      )}

      {!loading && stockItems.length > 0 && (
        <div className="table-wrap store-inventory-table">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Usable Stock</th>
                <th>Rejected Stock</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Issue Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map(item => {
                const isLow     = item.lowStock && item.usableStock > 0;
                const hasStock  = item.usableStock > 0;
                const status    = !hasStock ? "No Stock" : isLow ? "Low Stock" : "Available";
                const threshold = thresholds[item.materialId] ?? item.reorderLevel;
                return (
                  <tr key={item.materialId}>
                    <td>
                      <b>{item.name}</b>
                      <small className="inventory-subtext">{item.materialCode}</small>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td style={{ fontWeight: 700, color: isLow ? "#a3332b" : hasStock ? "#27603b" : "#999" }}>
                      {item.usableStock} {item.unit}
                    </td>
                    <td style={{ color: item.rejectedStock > 0 ? "#a3332b" : "#999" }}>
                      {item.rejectedStock > 0 ? `${item.rejectedStock} ${item.unit}` : "—"}
                    </td>
                    <td>
                      <input
                        className="inventory-threshold-input"
                        type="number"
                        min="0"
                        step="1"
                        value={threshold}
                        onChange={e => setThresholds(t => ({ ...t, [item.materialId]: e.target.value }))}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td>
                      <span className={`inventory-stock-status ${isLow ? "low" : hasStock ? "ok" : "restricted"}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      {hasStock ? (
                        <div className="inventory-issue-control">
                          <input
                            type="number"
                            min="0.01"
                            max={item.usableStock}
                            step="any"
                            placeholder="Qty"
                            value={issueValues[item.materialId] || ""}
                            onChange={e => setIssueValues(v => ({ ...v, [item.materialId]: e.target.value }))}
                          />
                          <button className="secondary" type="button" onClick={() => recordIssue(item)}>
                            Issue
                          </button>
                        </div>
                      ) : "—"}
                    </td>
                    <td>
                      <textarea
                        rows={2}
                        placeholder="Reason for issue, storage notes…"
                        value={remarksValues[item.materialId] || ""}
                        onChange={e => setRemarksValues(r => ({ ...r, [item.materialId]: e.target.value }))}
                        style={{
                          width: "100%",
                          minWidth: 180,
                          padding: "6px 8px",
                          fontSize: 12,
                          border: "1px solid #cbd6cc",
                          borderRadius: 6,
                          resize: "vertical",
                          fontFamily: "inherit",
                          lineHeight: 1.4,
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-row messages */}
      {Object.entries(messages).map(([id, msg]) => msg && (
        <p key={id} className="order-message" role="status" style={{ marginTop: 8 }}>{msg}</p>
      ))}

      {/* ── GRNs in Quarantine / Under Testing ── */}
      {quarantinedGRNs.length > 0 && (
        <section className="inventory-intake" style={{ marginTop: 32 }}>
          <div className="section-heading">
            <h3>In Quarantine / Under Testing</h3>
            <span>{quarantinedGRNs.length} GRNs</span>
          </div>
          <div className="table-wrap">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>GRN Number</th><th>PO Number</th><th>Supplier</th>
                  <th>Items</th><th>Status</th><th>Quarantine Sticker</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {quarantinedGRNs.map(grn => (
                  <tr key={grn._id}>
                    <td><b>{grn.grnNumber}</b></td>
                    <td>{grn.purchaseOrder?.poNumber || grn.poNumber || "—"}</td>
                    <td>{grn.purchaseOrder?.supplier?.name || grn.supplierName || "—"}</td>
                    <td>{grn.items?.length || 0} item(s)</td>
                    <td>
                      <span style={{
                        background: grn.status === "Under Testing" ? "#fff8e1" : "#fff0d1",
                        color: "#795914", padding: "3px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700
                      }}>
                        {grn.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{grn.quarantineSticker || "—"}</td>
                    <td>{new Date(grn.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Rejected GRNs ── */}
      {rejectedGRNs.length > 0 && (
        <section className="inventory-intake" style={{ marginTop: 32 }}>
          <div className="section-heading">
            <h3>Rejected · Return or Hold</h3>
            <span>{rejectedGRNs.length} unresolved</span>
          </div>
          <div className="table-wrap">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>GRN Number</th><th>Supplier</th><th>Items</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rejectedGRNs.map(grn => (
                  <tr key={grn._id}>
                    <td><b>{grn.grnNumber}</b></td>
                    <td>{grn.purchaseOrder?.supplier?.name || grn.supplierName || "—"}</td>
                    <td>{grn.items?.length || 0} item(s)</td>
                    <td>{new Date(grn.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
