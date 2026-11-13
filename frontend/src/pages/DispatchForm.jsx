import { useState, useEffect } from "react";
import { Truck } from "lucide-react";
import api from "../services/api.js";

const nowDatetime = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function DispatchForm({ user }) {
  const [availableLots, setAvailableLots] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [printDispatch, setPrintDispatch] = useState(null); // dispatch to print

  // form state
  const [selectedLotId, setSelectedLotId] = useState("");
  const [dispatchDate, setDispatchDate] = useState(nowDatetime());
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all finished goods (all statuses) and all dispatches
      const [lotsRes, dispatchesRes] = await Promise.all([
        api.get("/finished-goods"),
        api.get("/dispatch?limit=200"),
      ]);
      // Backend returns data array directly via api helper
      const allLots = Array.isArray(lotsRes) ? lotsRes : [];
      setAvailableLots(allLots.filter(l => l.status === "Available" && (l.availableQuantity || 0) > 0));
      setDispatches(Array.isArray(dispatchesRes) ? dispatchesRes : []);
    } catch {
      setMessage("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedLot = availableLots.find((l) => l._id === selectedLotId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!selectedLotId) { setMessage("Please select a finished goods lot."); return; }
    if (!destination.trim()) { setMessage("Please enter a location/purpose."); return; }
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setMessage("Quantity must be greater than zero."); return; }
    if (selectedLot && qty > selectedLot.availableQuantity) {
      setMessage(`Quantity exceeds available stock (${selectedLot.availableQuantity} ${selectedLot.unit || "units"}).`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post("/dispatch/direct", {
        finishedGoodsId: selectedLotId,
        quantity: qty,
        destination: destination.trim(),
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        dispatchDate: dispatchDate ? new Date(dispatchDate).toISOString() : undefined,
      });

      setMessage("✅ Dispatch created successfully! Stock has been deducted from finished goods.");
      setPrintDispatch(result);

      // reset form
      setSelectedLotId("");
      setDestination("");
      setQuantity("");
      setReferenceNumber("");
      setNotes("");
      setDispatchDate(nowDatetime());

      // reload data
      await loadData();
    } catch (err) {
      setMessage(err?.data?.message || err?.message || "Failed to create dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = (dispatch) => {
    setPrintDispatch(dispatch);
    setTimeout(() => window.print(), 100);
  };

  return (
    <>
      {/* ══ DISPATCH FORM ══════════════════════════════════════════════════ */}
      <section className="panel workflow-panel dispatch-screen" style={{ maxWidth: 900 }}>
        <div className="po-heading-row">
          <div>
            <span className="eyebrow">STORE INCHARGE · DISPATCH</span>
            <h2>Dispatch Form</h2>
            <p className="muted">Dispatch completed products from finished goods. Quantity is deducted automatically.</p>
          </div>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Loading finished goods…</p>
        ) : availableLots.length === 0 ? (
          <div className="info-box" style={{ margin: "16px 0" }}>
            <Truck size={18} />
            No finished goods are currently available for dispatch. Complete a production batch and pass QC to add finished goods.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── Select finished goods lot ── */}
            <div className="po-form-section">
              <h3>Select Finished Goods</h3>
              <label className="field-label" style={{ maxWidth: "100%" }}>
                Finished Goods Lot
                <select
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                >
                  <option value="">— Select a finished goods lot —</option>
                  {availableLots.map((lot) => (
                    <option key={lot._id} value={lot._id}>
                      {lot.productName} · {lot.bmrNumber || lot.lotNumber} · {lot.availableQuantity} {lot.unit || "units"} available
                    </option>
                  ))}
                </select>
              </label>

              {selectedLot && (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14,
                  padding: 14, background: "#f7f9f6", borderRadius: 10, border: "1px solid var(--line)",
                }}>
                  <div><small style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>PRODUCT NAME</small><br /><b style={{ fontSize: 13 }}>{selectedLot.productName}</b></div>
                  <div><small style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>BMR NUMBER</small><br /><b style={{ fontSize: 13, fontFamily: "monospace" }}>{selectedLot.bmrNumber || "—"}</b></div>
                  <div><small style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>AVAILABLE QTY</small><br /><b style={{ fontSize: 13 }}>{selectedLot.availableQuantity} {selectedLot.unit || "units"}</b></div>
                </div>
              )}
            </div>

            {/* ── Dispatch details ── */}
            <div className="po-form-section">
              <h3>Dispatch Details</h3>
              <div className="po-form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label className="field-label">
                  Dispatch Date &amp; Time
                  <input
                    type="datetime-local"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    required
                    style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                  />
                </label>
                <label className="field-label">
                  Quantity to Dispatch
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={`Max: ${selectedLot?.availableQuantity || "—"}`}
                    required
                    style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                  />
                </label>
              </div>
              <label className="field-label" style={{ marginTop: 14 }}>
                Location / Purpose
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Shipped to Mumbai warehouse / Sample sent for testing"
                  required
                  maxLength={500}
                  style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                />
              </label>
              <div className="po-form-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
                <label className="field-label">
                  Reference Number (optional)
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Invoice no, challan no, etc."
                    maxLength={100}
                    style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                  />
                </label>
                <label className="field-label">
                  Notes (optional)
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes"
                    maxLength={500}
                    style={{ height: 45, border: "1px solid #cbd6cc", borderRadius: 9, padding: "0 12px", background: "#fff" }}
                  />
                </label>
              </div>
            </div>

            {/* ── Dispatcher info ── */}
            <div className="info-box">
              <span style={{ fontWeight: 700, fontSize: 13 }}>Dispatched by:</span>
              <span style={{ fontSize: 13 }}>{user?.name || "—"}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>· {user?.role}</span>
            </div>

            {message && <p className="order-message" role="alert">{message}</p>}

            {/* ── Actions ── */}
            <div className="po-order-actions">
              <button type="submit" className="primary" disabled={submitting || !selectedLotId}>
                {submitting ? "Creating dispatch…" : "Create Dispatch"}
              </button>
              {printDispatch && (
                <button type="button" className="secondary" onClick={() => handlePrint(printDispatch)}>
                  🖨️ Print Last Dispatch
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* ══ DISPATCH HISTORY ════════════════════════════════════════════════ */}
      <section className="panel" style={{ marginTop: 24 }}>
        <div className="section-heading">
          <h3>Dispatch History</h3>
          <span>{dispatches.length} dispatches</span>
        </div>
        {dispatches.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispatch No.</th>
                  <th>Product</th>
                  <th>BMR No.</th>
                  <th>Quantity</th>
                  <th>Location / Purpose</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.dispatchNumber}</td>
                    <td><b>{d.productName}</b></td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.bmrNumber || "—"}</td>
                    <td>{d.quantity} {d.unit}</td>
                    <td>{d.destination || "—"}</td>
                    <td>{formatDateTime(d.dispatchDate || d.createdAt)}</td>
                    <td>
                      <span style={{
                        background: d.status === "Dispatched" ? "#e6f2e7" : d.status === "Cancelled" ? "#fae7e5" : "#fff8e1",
                        color: d.status === "Dispatched" ? "#27603b" : d.status === "Cancelled" ? "#a3332b" : "#795914",
                        padding: "4px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      }}>{d.status}</span>
                    </td>
                    <td>
                      <button type="button" className="secondary" style={{ padding: "4px 12px", fontSize: 12 }}
                        onClick={() => handlePrint(d)}>Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No dispatches yet. Create your first dispatch above.</p>
        )}
      </section>

      {/* ══ PRINTABLE DISPATCH SHEET ═════════════════════════════════════════ */}
      {printDispatch && (
        <section className="dispatch-print-sheet" aria-label="Printable dispatch form">
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "20pt" }}>DISPATCH FORM</h2>
            <p style={{ margin: 0, fontSize: "10pt" }}>Aroma Herbs Y Ayurvedic Industries Pvt. Ltd.</p>
            <p style={{ margin: "2px 0 0", fontSize: "10pt" }}>Plot No D-19, MIDC Industrial Area, Hingna, Nagpur · PH: 09960954999</p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold", width: "25%" }}>Dispatch No.</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", width: "25%" }}>{printDispatch.dispatchNumber}</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold", width: "25%" }}>Dispatch Date</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", width: "25%" }}>{formatDateTime(printDispatch.dispatchDate || printDispatch.createdAt)}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>Product Name</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px" }}>{printDispatch.productName}</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>BMR Number</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px" }}>{printDispatch.bmrNumber || "—"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>Quantity</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px" }}>{printDispatch.quantity} {printDispatch.unit}</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>Reference No.</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px" }}>{printDispatch.referenceNumber || "—"}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>Location / Purpose</td>
                <td style={{ border: "1px solid #111", padding: "8px 10px" }} colSpan={3}>{printDispatch.destination}</td>
              </tr>
              {printDispatch.notes && (
                <tr>
                  <td style={{ border: "1px solid #111", padding: "8px 10px", fontWeight: "bold" }}>Notes</td>
                  <td style={{ border: "1px solid #111", padding: "8px 10px" }} colSpan={3}>{printDispatch.notes}</td>
                </tr>
              )}
            </tbody>
          </table>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 40 }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #111", padding: "8px 10px", textAlign: "center", height: 70, width: "50%", verticalAlign: "bottom" }}>
                  <b>Dispatched By</b><br />
                  <span style={{ fontSize: "9pt" }}>{user?.name || ""}</span>
                </td>
                <td style={{ border: "1px solid #111", padding: "8px 10px", textAlign: "center", height: 70, width: "50%", verticalAlign: "bottom" }}>
                  <b>Received By</b>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
