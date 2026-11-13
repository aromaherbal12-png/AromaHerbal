import { useEffect, useState } from "react";
import api from "../services/api.js";
import QualitySticker from "./QualitySticker.jsx";

// Status-to-badge colour map
const BADGE_STYLES = {
  "Quarantined":   { bg: "#fff0d1", color: "#795914" },
  "Under Testing": { bg: "#fff8e1", color: "#795914" },
  "Approved":      { bg: "#e6f2e7", color: "#27603b" },
  "Rejected":      { bg: "#fae7e5", color: "#a3332b" },
  "Pending":       { bg: "#f0f1ef", color: "#5a625c" },
};
const Badge = ({ value }) => {
  const s = BADGE_STYLES[value] || { bg: "#f0f1ef", color: "#5a625c" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {value}
    </span>
  );
};

// Three decisions
const DECISIONS = [
  { value: "Under Testing", label: "◷ Send to Under Testing",         description: "Keep material quarantined and start lab tests." },
  { value: "Approved",      label: "✓ Approve & Add to Inventory",    description: "Mark all items Accepted and add stock to inventory." },
  { value: "Rejected",      label: "✕ Reject All",                    description: "Mark all items Rejected. Stock will not enter inventory." },
];

export default function QualityInspections({ user }) {
  const [grns, setGrns]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [decision, setDecision]       = useState("");
  const [message, setMessage]         = useState("");
  const [lastApproval, setLastApproval] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);

  useEffect(() => { loadGRNs(); }, []);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 6000);
  };

  const loadGRNs = async () => {
    setLoading(true);
    try {
      const [quarantined, underTesting] = await Promise.all([
        api.get("/inventory/goods-receipts?status=Quarantined"),
        api.get("/inventory/goods-receipts?status=Under+Testing"),
      ]);
      setGrns([
        ...(quarantined.items || []),
        ...(underTesting.items || []),
      ]);
    } catch (err) {
      setMessage("Failed to load GRNs: " + (err.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const selectGRN = (grn) => {
    setSelectedGRN(grn);
    setDecision("");
    setMessage("");
    setLastApproval(null);
  };

  const chooseDecision = (value) => {
    setDecision(value);
    setMessage("");
    setLastApproval(null);
  };

  const applyDecision = async () => {
    if (!selectedGRN || !decision) return;
    setSaving(true);
    try {
      // Step 1: Mark every item Accepted or Rejected based on decision
      const qualityStatus = decision === "Approved" ? "Accepted" : decision === "Rejected" ? "Rejected" : null;
      if (qualityStatus) {
        for (const item of (selectedGRN.items || [])) {
          await api.patch(
            `/inventory/goods-receipts/${selectedGRN._id}/items/${item._id}/status`,
            { qualityStatus }
          );
        }
      }

      // Step 2: Change GRN status
      const updated = await api.patch(
        `/inventory/goods-receipts/${selectedGRN._id}/status`,
        { status: decision }
      );

      // Record outcome for confirmation card
      if (decision === "Approved") {
        setLastApproval({
          grnNumber:       updated.grnNumber,
          poNumber:        updated.purchaseOrder?.poNumber || updated.poNumber || "",
          approvedSticker: updated.approvedSticker,
          itemCount:       (updated.items || []).length,
          approvedBy:      user?.name || "",
          approvedDate:    new Date().toLocaleDateString("en-IN"),
        });
      }

      setMessage(
        decision === "Approved"
          ? `✅ GRN ${updated.grnNumber} approved! Sticker ${updated.approvedSticker} generated. Items added to inventory.`
          : decision === "Rejected"
          ? `GRN ${updated.grnNumber} marked Rejected.`
          : `GRN ${updated.grnNumber} moved to Under Testing.`
      );

      if (decision === "Approved") {
        showToast(`✅ ${updated.grnNumber} approved and added to inventory. Sticker: ${updated.approvedSticker}`, "success");
      } else if (decision === "Rejected") {
        showToast(`${updated.grnNumber} marked as Rejected.`, "neutral");
      } else {
        showToast(`${updated.grnNumber} moved to Under Testing.`, "neutral");
      }

      setSelectedGRN(null);
      setDecision("");
      await loadGRNs();
    } catch (err) {
      const msg = err.data?.message || err.message || "Failed to save decision";
      setMessage(`❌ ${msg}`);
      showToast(`❌ ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const saveAndPrint = async () => {
    if (!selectedGRN) return;
    await applyDecision();
  };

  const stickerGRN = selectedGRN ? {
    id:               selectedGRN.grnNumber,
    material:         (selectedGRN.items || []).map(i => i.materialName).join(", "),
    receivedQty:      (selectedGRN.items || []).reduce((s, i) => s + (Number(i.receivedQty) || 0), 0),
    unit:             selectedGRN.items?.[0]?.unit || "",
    supplier:         selectedGRN.purchaseOrder?.supplier?.name || selectedGRN.supplierName || "",
    batchNo:          (selectedGRN.items || []).map(i => i.batchNumber).filter(Boolean).join(", "),
    receivedDate:     selectedGRN.items?.[0]?.receivedDate
                        ? new Date(selectedGRN.items[0].receivedDate).toISOString().slice(0, 10)
                        : new Date().toISOString().slice(0, 10),
    quarantineSticker: selectedGRN.quarantineSticker || "",
  } : null;

  return (
    <section className="panel workflow-panel">
      <span className="eyebrow">QUALITY INCHARGE</span>
      <h2>Material Inspections</h2>
      <p className="muted">
        GRNs sent to QC by Store Incharge appear here. Select a GRN, review items, then approve, reject, or send for further testing.
        Approved items are automatically added to inventory stock.
      </p>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#27603b" : toast.type === "error" ? "#a3332b" : "#3b4a42",
          color: "#fff", padding: "14px 20px", borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)", fontSize: 14,
          fontWeight: 600, maxWidth: 440, lineHeight: 1.5,
          display: "flex", alignItems: "center", gap: 12,
        }} role="status">
          <span style={{ flex: 1 }}>{toast.text}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* ── Approval confirmation card ── */}
      {lastApproval && (
        <div className="qc-approval-card" style={{ marginBottom: 20 }}>
          <div className="qc-approval-header">
            <span className="qc-approval-check">✓</span>
            <div>
              <span className="eyebrow">APPROVED &amp; IN STOCK</span>
              <h3>{lastApproval.grnNumber}</h3>
              <p className="muted">PO: {lastApproval.poNumber} · {lastApproval.itemCount} item(s)</p>
            </div>
          </div>
          <div className="qc-approval-details">
            <ApprovalDetail label="Approved Sticker" value={lastApproval.approvedSticker} highlight />
            <ApprovalDetail label="Approved By"      value={lastApproval.approvedBy} />
            <ApprovalDetail label="Approved Date"    value={lastApproval.approvedDate} />
            <ApprovalDetail label="Inventory Status" value="In Stock (Usable)" />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Stock has been added to the inventory ledger and is visible in Inventory Reports.
          </p>
          <button className="secondary" type="button" style={{ marginTop: 12, fontSize: 12 }} onClick={() => setLastApproval(null)}>Dismiss</button>
        </div>
      )}

      {message && !lastApproval && (
        <div className={`qc-result-banner ${message.startsWith("✅") ? "approved" : message.startsWith("❌") ? "rejected" : "neutral"}`} role="status" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div className="quality-layout">
        {/* ── Queue ── */}
        <div className="quality-queue">
          <div className="section-heading">
            <h3>Awaiting inspection</h3>
            <span>{loading ? "…" : grns.length}</span>
          </div>

          {loading && <p className="muted" style={{ padding: 12 }}>Loading…</p>}
          {!loading && grns.length === 0 && (
            <p className="empty-state">No GRNs are waiting for inspection.</p>
          )}

          {grns.map(grn => (
            <button
              key={grn._id}
              className={`quality-queue-item ${selectedGRN?._id === grn._id ? "selected" : ""}`}
              onClick={() => selectGRN(grn)}
            >
              <b>{grn.poNumber}</b>
              <small>{grn.grnNumber} · {grn.items?.length || 0} item(s)</small>
              <small>{grn.purchaseOrder?.supplier?.name || grn.supplierName || "Unknown supplier"}</small>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <Badge value={grn.status} />
                {grn.quarantineSticker && (
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#795914" }}>{grn.quarantineSticker}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ── Decision panel ── */}
        {selectedGRN && (
          <div className="quality-form">
            <h3 style={{ marginBottom: 4 }}>{selectedGRN.grnNumber}</h3>
            <p className="muted" style={{ marginBottom: 4 }}>
              PO: {selectedGRN.poNumber} · Supplier: {selectedGRN.purchaseOrder?.supplier?.name || selectedGRN.supplierName} · Status: <Badge value={selectedGRN.status} />
            </p>
            {selectedGRN.quarantineSticker && (
              <p style={{ fontFamily: "monospace", fontSize: 12, color: "#795914", marginBottom: 16 }}>
                Quarantine Sticker: {selectedGRN.quarantineSticker}
              </p>
            )}

            {/* Items table */}
            <div className="table-wrap" style={{ marginBottom: 20 }}>
              <table style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Batch/Lot</th>
                    <th>Received Qty</th>
                    <th>Unit</th>
                    <th>Invoice/Challan</th>
                    <th>Current QC Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedGRN.items || []).map(item => (
                    <tr key={item._id}>
                      <td><b>{item.materialName}</b></td>
                      <td>{item.batchNumber || "—"}</td>
                      <td>{item.receivedQty}</td>
                      <td>{item.unit}</td>
                      <td>{item.invoiceChallan || "—"}</td>
                      <td><Badge value={item.qualityStatus || "Pending Inspection"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Decision buttons */}
            <div className="decision-grid">
              {DECISIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`decision-card ${decision === opt.value ? "active" : ""}`}
                  onClick={() => chooseDecision(opt.value)}
                >
                  <b>{opt.label}</b>
                  <small>{opt.description}</small>
                </button>
              ))}
            </div>

            {/* Sticker + confirm area */}
            {decision && (
              <div style={{ marginTop: 20 }}>
                {decision === "Approved" && stickerGRN && (
                  <QualitySticker
                    key={`${selectedGRN._id}-${decision}`}
                    grn={stickerGRN}
                    decision="Approved"
                    user={user}
                    onPrint={saveAndPrint}
                  />
                )}

                {(decision === "Rejected" || decision === "Under Testing") && (
                  <>
                    {stickerGRN && (
                      <QualitySticker
                        key={`${selectedGRN._id}-${decision}`}
                        grn={stickerGRN}
                        decision={decision}
                        user={user}
                        onPrint={saveAndPrint}
                      />
                    )}
                    <button
                      type="button"
                      className="primary"
                      onClick={applyDecision}
                      disabled={saving}
                      style={{ marginTop: 12 }}
                    >
                      {saving ? "Saving…" : `Confirm: ${decision}`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ApprovalDetail({ label, value, highlight = false }) {
  return (
    <div className="qc-approval-detail">
      <span className="qc-approval-detail-label">{label}</span>
      <span className={`qc-approval-detail-value${highlight ? " highlight" : ""}`}>{value || "—"}</span>
    </div>
  );
}
