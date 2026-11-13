import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../services/api.js";

// ─── constants ────────────────────────────────────────────────────────────────
const FROM_ADDRESS = [
  "Aroma Herbs Y Ayurvedic Industries Pvt Ltd.",
  "Plot No D-19, MIDC Industrial Area,",
  "Hingna, Nagpur",
  "PH No:- 09960954999",
].join("\n");

const EMAIL_HISTORY_KEY = "aroma-po-email-history";

function loadEmailHistory() {
  try {
    const raw = localStorage.getItem(EMAIL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEmailHistory(list) {
  try {
    localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

const EMPTY_PRODUCT = { description: "", particulars: "", quantity: "", unit: "kg", rate: "", gstRate: "18" };

const roundMoney  = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const formatMoney = (v) => roundMoney(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate  = (v) => { if (!v) return ""; const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; };
const todayStr    = () => new Date().toISOString().slice(0, 10);
const money       = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v) || 0);

const toISODateTime = (dateStr) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes("T")) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
};

// ─── main component ───────────────────────────────────────────────────────────
export default function PurchaseOrderForm({ user }) {

  // ── local PO register state (owns its own fetch) ──
  const [purchaseOrders, setPurchaseOrderList] = useState([]);

  const loadPORegister = useCallback(async () => {
    try {
      const res = await api.get("/inventory/purchase-orders?limit=200");
      setPurchaseOrderList(res.items || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadPORegister(); }, [loadPORegister]);

  // ── PO form state ──
  const [stage, setStage]           = useState("products");
  const [items, setItems]           = useState([]);
  const [draft, setDraft]           = useState(EMPTY_PRODUCT);
  const [poMessage, setPoMessage]   = useState("");
  const [form, setForm]             = useState({
    fromGst: "27AAICA3466D1ZS",
    toAddress: "Magus Organochem\n34, Aggarwal Shoppers Plaza,\nBlock-I, Sector 16, Rohini,\nNew Delhi-110089",
    toGst: "07AIDPG7631E1ZK",
    quotationNo: "", date: todayStr(), expectedDate: "", transporter: "", packagingForwarding: "0",
  });
  const [orderType, setOrderType]   = useState("Purchase Order");
  const [savedPO, setSavedPO]       = useState(null);
  const [poLoading, setPoLoading]   = useState(false);
  const [selectedPOForTracking, setSelectedPOForTracking] = useState(null);

  // ── Email modal state ──
  const [emailModal, setEmailModal] = useState(false);
  const [emailHistory, setEmailHistory] = useState(() => loadEmailHistory());

  // ── GRN state ──
  const [backendPOs,    setBackendPOs]    = useState([]);
  const [backendGRNs,   setBackendGRNs]   = useState([]);
  const [selectedPOId,  setSelectedPOId]  = useState("");
  const [selectedPO,    setSelectedPO]    = useState(null);
  const [itemRows,      setItemRows]      = useState([]);
  const [editingGRN,    setEditingGRN]    = useState(null);
  const [grnMessage,    setGrnMessage]    = useState("");
  const [grnLoading,    setGrnLoading]    = useState(false);
  const [selectedGRNId, setSelectedGRNId] = useState("");
  const [toast,         setToast]         = useState(null); // { message, type }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── PO computed ──
  const subtotal   = useMemo(() => roundMoney(items.reduce((s, i) => s + i.amount, 0)), [items]);
  const totalGst   = useMemo(() => roundMoney(items.reduce((s, i) => s + i.gstAmount, 0)), [items]);
  const grandTotal = useMemo(() => roundMoney(subtotal + totalGst + Math.max(0, Number(form.packagingForwarding) || 0)), [subtotal, totalGst, form.packagingForwarding]);
  const draftValid = draft.description.trim() && draft.particulars.trim() && Number(draft.quantity) > 0 && draft.unit.trim() && Number(draft.rate) >= 0 && Number(draft.gstRate) >= 0;

  // ── load GRN data ──
  useEffect(() => { loadBackendPOs(); loadGRNs(); loadPORegister(); }, [loadPORegister]);

  const loadBackendPOs = async () => {
    try {
      const data = await api.get("/inventory/purchase-orders?limit=500");
      // Keep all statuses that can still receive goods (Approved or Partially Received)
      setBackendPOs((data.items || []).filter(po =>
        po.status === "Approved" || po.status === "Partially Received"
      ));
    } catch { setBackendPOs([]); }
  };

  const loadGRNs = async () => {
    try {
      const data = await api.get("/inventory/goods-receipts?limit=500");
      setBackendGRNs(data.items || []);
    } catch { /* ignore */ }
  };

  // ── PO form handlers ──────────────────────────────────────────────────────
  const changeForm  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const changeDraft = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const addProduct = (continueToTotals) => {
    if (!draftValid) { setPoMessage("Complete all product fields first."); return; }
    const base = roundMoney(Number(draft.quantity) * Number(draft.rate));
    const gst  = roundMoney(base * Number(draft.gstRate) / 100);
    setItems(cur => [...cur, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...draft,
      quantity: Number(draft.quantity), unit: draft.unit.trim(),
      rate: Number(draft.rate), gstRate: Number(draft.gstRate),
      amount: base, gstAmount: gst, totalAmount: roundMoney(base + gst),
    }]);
    setDraft(EMPTY_PRODUCT);
    setPoMessage("");
    if (continueToTotals) setStage("totals");
  };

  const saveOrder = async () => {
    if (savedPO) return;
    if (!items.length || !form.expectedDate || !form.quotationNo.trim() || !form.toAddress.trim() || !form.toGst.trim() || !form.fromGst.trim() || !form.transporter.trim()) {
      setPoMessage("Complete supplier, GST, quotation, expected delivery date, transporter, and products before saving.");
      return;
    }
    try {
      setPoLoading(true);
      setPoMessage("Creating supplier in backend...");
      const supplierName = form.toAddress.split("\n")[0].trim();

      // find or create supplier
      let supplier;
      try {
        const supData = await api.get(`/inventory/suppliers?search=${encodeURIComponent(supplierName)}`);
        supplier = supData.items?.find(s => s.name === supplierName);
      } catch { /* search failed — will create */ }
      if (!supplier) {
        setPoMessage("Creating new supplier...");
        supplier = await api.post("/inventory/suppliers", {
          supplierCode: `SUP-${Date.now()}`,
          name: supplierName,
          contactPerson: "",
          email: "",
          phone: "",
          address: form.toAddress || "",
          taxId: form.toGst || "",
          notes: "",
        });
      }

      // find or create materials
      setPoMessage("Creating materials in backend...");
      const poItems = [];
      for (const item of items) {
        let material;
        try {
          const matData = await api.get(`/inventory/materials?search=${encodeURIComponent(item.description)}`);
          material = matData.items?.find(m => m.name === item.description);
        } catch { /* search failed — will create */ }
        if (!material) {
          setPoMessage(`Creating material: ${item.description}...`);
          material = await api.post("/inventory/materials", {
            name: item.description,
            materialCode: `MAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            category: "Raw Material",
            unit: item.unit.trim().toUpperCase() || "KG",
            reorderLevel: 0,
            description: item.particulars || "",
          });
        }
        poItems.push({
          materialId: material._id,
          orderedQty: Number(item.quantity),
          unitPrice: Number(item.rate),
          gstRate: Number(item.gstRate) || 18,
        });
      }

      // create PO
      setPoMessage("Creating purchase order...");
      const expectedDelivery = form.expectedDate ? new Date(form.expectedDate + "T00:00:00.000Z").toISOString() : undefined;
      const poPayload = {
        supplierId: supplier._id,
        items: poItems,
        notes: `Quotation: ${form.quotationNo}, Transporter: ${form.transporter}, Type: ${orderType}`,
      };
      if (expectedDelivery) poPayload.expectedDeliveryDate = expectedDelivery;

      const backendPO = await api.post("/inventory/purchase-orders", poPayload);

      setPoMessage("Approving purchase order...");
      await api.patch(`/inventory/purchase-orders/${backendPO._id}/approve`);

      setSavedPO({ id: backendPO.poNumber, status: "Approved", items });
      // Reload the local PO register
      await loadPORegister();
      setPoMessage(`✅ ${backendPO.poNumber} created and approved! Print the PO, then use the GRN section below.`);

      // immediately add new PO to GRN dropdown
      try {
        const approvedData = await api.get(`/inventory/purchase-orders/${backendPO._id}`);
        setBackendPOs(prev => prev.some(p => p._id === approvedData._id) ? prev : [approvedData, ...prev]);
      } catch { await loadBackendPOs(); }
    } catch (err) {
      const details = err?.data?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        setPoMessage(`❌ Validation error: ${details.map(d => `${d.field}: ${d.message}`).join(" | ")}`);
      } else {
        const msg = err?.data?.message || err?.message || "Unknown error";
        if (msg.includes("unavailable") || msg.includes("expired") || msg.includes("401")) {
          setPoMessage("❌ Session expired — please log out and log back in, then try again.");
        } else {
          setPoMessage(`❌ ${msg}`);
        }
      }
    } finally {
      setPoLoading(false);
    }
  };

  const printOrder = () => {
    const toPrint = savedPO?.items || items;
    if (!toPrint.length) { setPoMessage("Add at least one product before printing."); return; }
    if (savedPO) { setPoMessage(""); window.print(); return; }
    if (!form.quotationNo.trim() || !form.toAddress.trim() || !form.toGst.trim() || !form.fromGst.trim() || !form.transporter.trim()) {
      setPoMessage("Complete all form fields before printing."); return;
    }
    setPoMessage(""); window.print();
  };

  // ── GRN handlers ──────────────────────────────────────────────────────────
  const selectPO = async (poId) => {
    if (!poId) { setSelectedPOId(""); setSelectedPO(null); setItemRows([]); setEditingGRN(null); return; }
    try {
      setGrnLoading(true);
      const data = await api.get(`/inventory/purchase-orders/${poId}`);
      setSelectedPOId(poId);
      setSelectedPO(data);
      setItemRows((data.items || []).map(item => ({
        material: String(item.material?._id || item.material || ""),   // always plain ObjectId string
        materialName: item.materialName || item.material?.name || "",
        category: item.category || item.material?.category || "Raw Material",
        unit: item.unit || item.material?.unit || "",
        unitPrice: item.unitPrice || 0,
        orderedQty: item.orderedQty || 0,
        previouslyReceived: item.receivedQty || 0,
        outstandingQty: (item.orderedQty || 0) - (item.receivedQty || 0),
        receiveNow: 0, batchNumber: "", invoiceChallan: "", receivedDate: todayStr(),
      })));
      setEditingGRN(null);
    } catch { setGrnMessage("Failed to load purchase order details"); }
    finally { setGrnLoading(false); }
  };

  const updateItemRow = (index, field, value) =>
    setItemRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));

  const buildGRNPayload = (isDraft) => ({
    purchaseOrderId: selectedPOId,
    isDraft,
    items: itemRows.filter(r => Number(r.receiveNow) > 0 && r.material).map(r => ({
      material: String(r.material?._id || r.material),  // always send plain ObjectId string
      orderedQty: Number(r.orderedQty),
      receivedQty: Number(r.receiveNow),
      unit: r.unit,
      unitPrice: Number(r.unitPrice),
      batchNumber: r.batchNumber || "",
      invoiceChallan: r.invoiceChallan || "",
      receivedDate: toISODateTime(r.receivedDate),
    })),
  });

  const submitGRN = async (isDraft) => {
    if (!selectedPOId) { setGrnMessage("Please select a purchase order"); return; }
    const toSave = itemRows.filter(r => Number(r.receiveNow) > 0);
    if (!toSave.length) { setGrnMessage("Enter received quantities for at least one item"); return; }
    try {
      setGrnLoading(true);
      const payload = buildGRNPayload(isDraft);
      if (editingGRN) {
        const result = await api.patch(`/inventory/goods-receipts/${editingGRN._id}`, payload);
        const msg = isDraft
          ? `GRN ${editingGRN.grnNumber} saved as draft`
          : `GRN ${editingGRN.grnNumber} sent to QC — sticker ${result.quarantineSticker || "generated"}`;
        setGrnMessage(msg);

        // Check if all items in the PO are now fully received
        if (!isDraft && selectedPO) {
          const fullyReceived = (selectedPO.items || []).every(poItem => {
            const received = itemRows
              .filter(r => String(r.material?._id || r.material) === String(poItem.material?._id || poItem.material))
              .reduce((s, r) => s + Number(r.receiveNow || 0), 0);
            const totalReceived = Number(poItem.receivedQty || 0) + received;
            return totalReceived >= Number(poItem.orderedQty || 0) - 1e-9;
          });
          if (fullyReceived) {
            showToast(`✅ All items for ${selectedPO.poNumber} have been fully received and sent to QC!`, "success");
          }
        }
      } else {
        const result = await api.post("/inventory/goods-receipts", payload);
        const msg = isDraft
          ? `GRN ${result.grnNumber} saved as draft (Pending)`
          : `GRN ${result.grnNumber} sent to QC — sticker ${result.quarantineSticker}`;
        setGrnMessage(msg);

        // Check if all items fully received on new GRN
        if (!isDraft && selectedPO) {
          const allFullyReceived = itemRows.every(row => {
            const alreadyReceived = Number(row.previouslyReceived || 0);
            const nowReceiving = Number(row.receiveNow || 0);
            return (alreadyReceived + nowReceiving) >= Number(row.orderedQty || 0) - 1e-9;
          });
          if (allFullyReceived) {
            showToast(`✅ All items for ${selectedPO.poNumber} have been fully received and sent to QC!`, "success");
          }
        }
      }
      await loadGRNs();
      await loadBackendPOs();
      resetGRNForm();
    } catch (err) {
      const details = err.data?.details;
      let msg = err.data?.message || err.message || "Failed to save GRN";
      if (details && Array.isArray(details) && details.length > 0) {
        msg += ": " + details.map(d => `${d.field} → ${d.message}`).join(" | ");
      } else if (err.data?.debugMessage) {
        msg += ` (${err.data.debugMessage})`;
      }
      setGrnMessage("❌ " + msg);
    } finally { setGrnLoading(false); }
  };

  const editPendingGRN = async (grnId) => {
    try {
      setGrnLoading(true);
      const grn = backendGRNs.find(g => g._id === grnId);
      if (!grn) return;
      const poData = await api.get(`/inventory/purchase-orders/${grn.purchaseOrder?._id || grn.purchaseOrder}`);
      setSelectedPOId(poData._id);
      setSelectedPO(poData);
      setEditingGRN(grn);
      setItemRows((poData.items || []).map(poItem => {
        const materialId = String(poItem.material?._id || poItem.material || "");
        const ex = grn.items?.find(gi => {
          const giMat = String(gi.material?._id || gi.material || "");
          return giMat && materialId && giMat === materialId;
        });
        return {
          material: materialId || null,
          materialName: poItem.materialName || poItem.material?.name || "",
          category: poItem.category || poItem.material?.category || "Raw Material",
          unit: poItem.unit || poItem.material?.unit || "",
          unitPrice: poItem.unitPrice || 0,
          orderedQty: poItem.orderedQty || 0,
          previouslyReceived: poItem.receivedQty || 0,
          outstandingQty: (poItem.orderedQty || 0) - (poItem.receivedQty || 0),
          receiveNow: ex ? ex.receivedQty : 0,
          batchNumber: ex?.batchNumber || "",
          invoiceChallan: ex?.invoiceChallan || "",
          receivedDate: ex?.receivedDate ? new Date(ex.receivedDate).toISOString().slice(0, 10) : todayStr(),
        };
      }));
      setGrnMessage(`Editing GRN ${grn.grnNumber}`);
      document.getElementById("grn-section")?.scrollIntoView({ behavior: "smooth" });
    } catch { setGrnMessage("Failed to load GRN for editing"); }
    finally { setGrnLoading(false); }
  };

  const resetGRNForm = () => { setSelectedPOId(""); setSelectedPO(null); setItemRows([]); setEditingGRN(null); };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══ TOAST NOTIFICATION ══════════════════════════════════════════════ */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#27603b" : "#a3332b",
          color: "#fff", padding: "14px 22px", borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)", fontSize: 15,
          fontWeight: 600, maxWidth: 420, lineHeight: 1.5,
          display: "flex", alignItems: "center", gap: 12,
          animation: "slideIn 0.25s ease",
        }} role="alert">
          <span style={{ fontSize: 20 }}>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}
            aria-label="Dismiss"
          >×</button>
        </div>
      )}
      {/* ══ PO FORM ══════════════════════════════════════════════════════════ */}
      <section className="panel workflow-panel po-screen">
        <div className="po-heading-row">
          <div>
            <span className="eyebrow">STORE INCHARGE · PURCHASE ORDER</span>
            <h2>Create Purchase Order</h2>
            <p className="muted">Fill in the details below, save the PO, print it, then create a GRN in the section below.</p>
          </div>
          {stage === "totals" && savedPO && <span className="role-pill">{savedPO.id}</span>}
        </div>

        {/* From */}
        <div className="po-form-section">
          <h3>From</h3>
          <div className="po-form-grid">
            <label className="field-label">Company address<textarea value={FROM_ADDRESS} readOnly rows="4" /></label>
            <Field label="From GST No." value={form.fromGst} onChange={v => changeForm("fromGst", v)} required disabled={Boolean(savedPO)} />
          </div>
        </div>

        {/* To */}
        <div className="po-form-section">
          <h3>To</h3>
          <div className="po-form-grid">
            <label className="field-label">Recipient and address<textarea value={form.toAddress} onChange={e => changeForm("toAddress", e.target.value)} rows="4" required disabled={Boolean(savedPO)} /></label>
            <Field label="To GST No." value={form.toGst} onChange={v => changeForm("toGst", v)} required disabled={Boolean(savedPO)} />
          </div>
        </div>

        {/* Meta */}
        <div className="po-form-grid po-meta-form">
          <label className="field-label">Order Type
            <select value={orderType} onChange={e => setOrderType(e.target.value)} disabled={Boolean(savedPO)}>
              <option>Purchase Order</option><option>Sample Request</option><option>Customized Order</option>
            </select>
          </label>
          <Field label="Quotation Number"      value={form.quotationNo}        onChange={v => changeForm("quotationNo", v)}        required disabled={Boolean(savedPO)} />
          <Field label="P.O. Date"             type="date" value={form.date}   onChange={v => changeForm("date", v)}               required disabled={Boolean(savedPO)} />
          <Field label="Expected Delivery Date" type="date" value={form.expectedDate} onChange={v => changeForm("expectedDate", v)} required disabled={Boolean(savedPO)} />
          <Field label="Transporter Name"      value={form.transporter}        onChange={v => changeForm("transporter", v)}        required disabled={Boolean(savedPO)} />
        </div>

        {/* Products */}
        <div className="po-form-section">
          <h3>Products</h3>
          {items.length > 0 && (
            <div className="table-wrap po-items-preview">
              <table>
                <thead><tr><th>Name</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>GST %</th><th>Base</th><th>GST</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>{item.description}</td><td>{item.particulars}</td><td>{item.quantity}</td><td>{item.unit}</td>
                      <td>₹ {formatMoney(item.rate)}</td><td>{item.gstRate}%</td>
                      <td>₹ {formatMoney(item.amount)}</td><td>₹ {formatMoney(item.gstAmount)}</td><td>₹ {formatMoney(item.totalAmount)}</td>
                      <td><button className="po-remove" type="button" disabled={Boolean(savedPO)} onClick={() => setItems(c => c.filter(r => r.id !== item.id))}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="po-product-entry">
            <Field label="Name"             value={draft.description} onChange={v => changeDraft("description", v)} required disabled={Boolean(savedPO)} />
            <Field label="Description"      value={draft.particulars} onChange={v => changeDraft("particulars", v)} required disabled={Boolean(savedPO)} />
            <Field label="Quantity"   type="number" min="0.01" step="any" value={draft.quantity} onChange={v => changeDraft("quantity", v)} required disabled={Boolean(savedPO)} />
            <Field label="Unit"             value={draft.unit}        onChange={v => changeDraft("unit", v)}        placeholder="kg, L, units" required disabled={Boolean(savedPO)} />
            <Field label="Rate/kg"    type="number" min="0" step="0.01" value={draft.rate}    onChange={v => changeDraft("rate", v)}    required disabled={Boolean(savedPO)} />
            <Field label="GST %"      type="number" min="0" max="100" step="0.01" value={draft.gstRate} onChange={v => changeDraft("gstRate", v)} required disabled={Boolean(savedPO)} />
            <label className="field-label">Base Amount  <input readOnly value={draft.quantity && draft.rate ? `₹ ${formatMoney(Number(draft.quantity) * Number(draft.rate))}` : "Auto"} /></label>
            <label className="field-label">GST Amount   <input readOnly value={draft.quantity && draft.rate && draft.gstRate ? `₹ ${formatMoney(Number(draft.quantity) * Number(draft.rate) * Number(draft.gstRate) / 100)}` : "Auto"} /></label>
            <label className="field-label">Total Amount <input readOnly value={draft.quantity && draft.rate && draft.gstRate ? `₹ ${formatMoney(Number(draft.quantity) * Number(draft.rate) * (1 + Number(draft.gstRate) / 100))}` : "Auto"} /></label>
          </div>
          {poMessage && stage === "products" && <p className="order-message" role="alert">{poMessage}</p>}
          {stage === "products" && !savedPO && (
            <div className="po-action-row">
              <button type="button" className="secondary" onClick={() => addProduct(false)} disabled={!draftValid}>Add another product</button>
              <button type="button" className="primary"   onClick={() => addProduct(true)}  disabled={!draftValid}>Continue to totals</button>
            </div>
          )}
          {stage === "totals" && !savedPO && <button type="button" className="secondary" onClick={() => { setStage("products"); setPoMessage(""); }}>Back to product entry</button>}
        </div>

        {/* Totals + Save */}
        {stage === "totals" && (
          <>
            <div className="po-form-section po-totals-section">
              <h3>Order totals</h3>
              <div className="po-total-row"><span>Subtotal</span><b>₹ {formatMoney(subtotal)}</b></div>
              <div className="po-total-row"><span>Total GST</span><b>₹ {formatMoney(totalGst)}</b></div>
              <label className="field-label po-forwarding">Packaging &amp; Forwarding
                <input type="number" min="0" step="0.01" value={form.packagingForwarding} onChange={e => changeForm("packagingForwarding", e.target.value)} disabled={Boolean(savedPO)} />
              </label>
              <div className="po-total-row po-grand-total"><span>Grand Total</span><b>₹ {formatMoney(grandTotal)}</b></div>
            </div>
            <div className="po-form-section">
              <h3>Payment Terms &amp; Condition</h3>
              <div className="po-terms-placeholder">Terms will be added when provided by the company.</div>
            </div>
            {poMessage && <p className="order-message" role="alert">{poMessage}</p>}
            <div className="po-order-actions">
              {!savedPO && (
                <button type="button" className="secondary" onClick={saveOrder} disabled={poLoading}>
                  {poLoading ? "Creating PO..." : "Save Purchase Order"}
                </button>
              )}
              {savedPO && <p className="success-note">Saved as {savedPO.id} · {savedPO.status}</p>}
              <button type="button" className="primary" onClick={printOrder} disabled={!savedPO}>Print Purchase Order</button>
              <button
                type="button"
                className="secondary"
                disabled={!savedPO}
                onClick={() => setEmailModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                ✉️ Send Email
              </button>
              {savedPO && (
                <button type="button" className="secondary" onClick={() => {
                  setSavedPO(null);
                  setItems([]);
                  setDraft(EMPTY_PRODUCT);
                  setStage("products");
                  setOrderType("Purchase Order");
                  setForm({ fromGst: "27AAICA3466D1ZS", toAddress: "Magus Organochem\n34, Aggarwal Shoppers Plaza,\nBlock-I, Sector 16, Rohini,\nNew Delhi-110089", toGst: "07AIDPG7631E1ZK", quotationNo: "", date: todayStr(), expectedDate: "", transporter: "", packagingForwarding: "0" });
                  setPoMessage("");
                }}>
                  + Create New PO
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ══ PRINTABLE SHEET (print-only) ═════════════════════════════════════ */}
      <section className="po-print-sheet" aria-label="Printable purchase order">
        <table className="po-print-main"><tbody>
          <tr><th className="po-print-title" colSpan="2">PURCHASE ORDER</th></tr>
          <tr><td className="po-print-address"><b>From</b><br />{FROM_ADDRESS.split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</td><td className="po-print-gst"><b>GST NO.</b><br />{form.fromGst}</td></tr>
          <tr><td className="po-print-address"><b>To</b><br />{form.toAddress.split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</td><td className="po-print-gst"><b>GST NO.</b><br />{form.toGst}</td></tr>
        </tbody></table>
        <table className="po-print-meta"><tbody><tr>
          <td><b>P.O. No.</b><br />{savedPO?.id || ""}<small>Quotation: {form.quotationNo}</small></td>
          <td><b>P.O. Date</b><br />{formatDate(form.date)}</td>
          <td><b>Transporter Name</b><br />{form.transporter}</td>
        </tr></tbody></table>
        <table className="po-print-products">
          <thead><tr><th>Name</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate/Kg</th><th>GST %</th><th>Base</th><th>GST</th><th>Total</th></tr></thead>
          <tbody>{(savedPO?.items || items).map(item => <tr key={item.id}><td>{item.description}</td><td>{item.particulars}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{formatMoney(item.rate)}</td><td>{item.gstRate}%</td><td>{formatMoney(item.amount)}</td><td>{formatMoney(item.gstAmount)}</td><td>{formatMoney(item.totalAmount)}</td></tr>)}</tbody>
          <tfoot>
            <tr><th colSpan="8">Subtotal</th><td>{formatMoney(savedPO?.subtotal || subtotal)}</td></tr>
            <tr><th colSpan="8">Total GST</th><td>{formatMoney(savedPO?.totalGst || totalGst)}</td></tr>
            <tr><th colSpan="8">Packaging &amp; Forwarding</th><td>{formatMoney(savedPO?.packagingForwarding || form.packagingForwarding)}</td></tr>
            <tr><th colSpan="8">Grand Total</th><td>{formatMoney(savedPO?.grandTotal || grandTotal)}</td></tr>
          </tfoot>
        </table>
        <table className="po-print-terms"><tbody><tr><th>Payment Terms &amp; Condition</th><th>For Aroma Herbs Y Ayurvedic Industries</th></tr><tr><td><div className="po-blank-terms"></div></td><td><div className="po-signature-space"></div></td></tr></tbody></table>
      </section>

      {/* ══ GRN SECTION ══════════════════════════════════════════════════════ */}
      <section id="grn-section" className="panel workflow-panel" style={{ marginTop: 24 }}>
        <span className="eyebrow">STORE INCHARGE · GRN</span>
        <h2>Goods Receipt Notes</h2>
        <p className="muted">Select a saved Purchase Order to record received quantities, then save as draft or complete and send to QC.</p>

        {/* PO dropdown */}
        <div style={{ marginBottom: 24 }}>
          <label className="field-label" style={{ maxWidth: 520 }}>
            Select Purchase Order
            <select value={selectedPOId} onChange={e => selectPO(e.target.value)} disabled={grnLoading}>
              <option value="">— Select a Purchase Order —</option>
              {backendPOs.map(po => (
                <option key={po._id} value={po._id} disabled={po.status === "Draft"}>
                  {po.poNumber} · {po.supplier?.name || "Unknown"} · {po.status}
                  {po.status === "Draft" ? " (Needs Approval)" : ""}
                </option>
              ))}
            </select>
          </label>
          {backendPOs.length === 0 && (
            <p style={{ fontSize: 13, color: "#a3332b", marginTop: 8, background: "#fbe8e5", padding: "8px 12px", borderRadius: 4 }}>
              ⚠️ No approved purchase orders found. Create and save a PO above first.
            </p>
          )}
        </div>

        {/* GRN item table — shown only when a PO is selected */}
        {selectedPO && (
          <>
            <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 6, marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, marginBottom: 4 }}>{selectedPO.poNumber} · {selectedPO.supplier?.name}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                Status: {selectedPO.status} · Created: {new Date(selectedPO.createdAt).toLocaleDateString("en-IN")}
              </p>
              {editingGRN && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#795914", background: "#fff8e1", padding: "8px 12px", borderRadius: 4 }}>
                  <b>Editing GRN:</b> {editingGRN.grnNumber} ({editingGRN.status})
                </p>
              )}
            </div>

            <div className="table-wrap" style={{ marginBottom: 20 }}>
              <table style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Material Name</th><th>Category</th><th>Unit</th><th>Rate/Unit</th>
                    <th>Ordered Qty</th><th>Previously Received</th><th>Outstanding</th>
                    <th style={{ background: "#e6f2e7" }}>Receive Now</th>
                    <th>Batch/Lot</th><th>Invoice/Challan</th><th>Received Date</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row, idx) => (
                    <tr key={idx}>
                      <td><b>{row.materialName}</b></td>
                      <td>{row.category}</td>
                      <td>{row.unit}</td>
                      <td>{money(row.unitPrice)}</td>
                      <td>{row.orderedQty}</td>
                      <td>{row.previouslyReceived}</td>
                      <td><b>{row.outstandingQty}</b></td>
                      <td style={{ background: "#f8fcf8" }}>
                        <input type="number" min="0" max={row.outstandingQty} step="0.01"
                          value={row.receiveNow} placeholder="0"
                          onChange={e => updateItemRow(idx, "receiveNow", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", fontSize: 13 }} />
                      </td>
                      <td>
                        <input type="text" value={row.batchNumber} placeholder="Batch"
                          onChange={e => updateItemRow(idx, "batchNumber", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", fontSize: 13 }} />
                      </td>
                      <td>
                        <input type="text" value={row.invoiceChallan} placeholder="Invoice"
                          onChange={e => updateItemRow(idx, "invoiceChallan", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", fontSize: 13 }} />
                      </td>
                      <td>
                        <input type="date" value={row.receivedDate}
                          onChange={e => updateItemRow(idx, "receivedDate", e.target.value)}
                          style={{ width: 140, padding: "6px 8px", fontSize: 13 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="secondary" onClick={() => submitGRN(true)} disabled={grnLoading} style={{ minWidth: 160 }}>
                {grnLoading ? "Saving..." : "Save as Draft"}
              </button>
              <button type="button" className="primary" onClick={() => submitGRN(false)} disabled={grnLoading} style={{ minWidth: 210 }}>
                {grnLoading ? "Processing..." : "Complete & Send to QC"}
              </button>
              <button type="button" className="secondary" onClick={resetGRNForm} disabled={grnLoading}>Clear</button>
            </div>
          </>
        )}

        {grnMessage && <p className="order-message" role="status" style={{ marginTop: 16 }}>{grnMessage}</p>}

        {/* GRN list table */}
        <GRNTable grns={backendGRNs} selectedId={selectedGRNId} onSelect={setSelectedGRNId} loadGRNs={loadGRNs} onEdit={editPendingGRN} />
      </section>

      {/* ══ EMAIL MODAL ══════════════════════════════════════════════════════ */}
      {emailModal && (
        <SendEmailModal
          savedPO={savedPO}
          form={form}
          items={items}
          subtotal={subtotal}
          totalGst={totalGst}
          grandTotal={grandTotal}
          emailHistory={emailHistory}
          onUpdateHistory={(updated) => {
            setEmailHistory(updated);
            saveEmailHistory(updated);
          }}
          onClose={() => setEmailModal(false)}
        />
      )}

      {/* ══ PURCHASE ORDER REGISTER ══════════════════════════════════════════ */}
      <section className="panel po-register-screen">        <div className="section-heading"><h3>Purchase Order Register</h3><span>{purchaseOrders.length} orders</span></div>
        {purchaseOrders.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Expected Date</th><th>Items</th><th>Order Total</th><th>Status</th></tr></thead>
              <tbody>
                {purchaseOrders.map(order => (
                  <tr key={order._id} onClick={() => setSelectedPOForTracking(selectedPOForTracking?._id === order._id ? null : order)} style={{ cursor: "pointer" }}>
                    <td><b>{order.poNumber}</b></td>
                    <td>{order.supplierName || "—"}</td>
                    <td>{order.expectedDeliveryDate ? formatDate(new Date(order.expectedDeliveryDate).toISOString().slice(0,10)) : "—"}</td>
                    <td>{(order.items || []).map(i => i.materialName || i.description || "").join(", ")}</td>
                    <td>₹ {formatMoney(order.subtotal || 0)}</td>
                    <td><StatusBadge value={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty-state">Saved purchase orders will appear here.</p>}
      </section>
    </>
  );
}

// ─── GRN Table ────────────────────────────────────────────────────────────────
function GRNTable({ grns, selectedId, onSelect, loadGRNs, onEdit }) {
  const selected = grns.find(g => g._id === selectedId);
  return (
    <>
      <div className="table-wrap" style={{ marginTop: 32 }}>
        <div className="section-heading"><h3>All Goods Receipt Notes</h3><span>{grns.length} GRNs</span></div>
        {grns.length ? (
          <table>
            <thead>
              <tr>
                <th>GRN Number</th><th>PO Number</th><th>Supplier</th><th>Items</th>
                <th>Status</th><th>Quarantine Sticker</th><th>Approved Sticker</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns.map(grn => (
                <tr key={grn._id} style={{ background: grn._id === selectedId ? "#f3f8f2" : "" }}>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}><b>{grn.grnNumber}</b></td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}>{grn.purchaseOrder?.poNumber || "—"}</td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}>{grn.purchaseOrder?.supplier?.name || "—"}</td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}>{grn.items?.length || 0} items</td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}><StatusBadge value={grn.status} /></td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}>{grn.quarantineSticker || "—"}</td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer", fontFamily: "monospace", fontSize: 12 }}>{grn.approvedSticker || "—"}</td>
                  <td onClick={() => onSelect(grn._id === selectedId ? "" : grn._id)} style={{ cursor: "pointer" }}>{new Date(grn.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    {grn.status === "Pending" && (
                      <button type="button" className="secondary" style={{ padding: "4px 12px", fontSize: 12 }}
                        onClick={e => { e.stopPropagation(); onEdit(grn._id); }}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty-state">No GRNs yet. Select a purchase order above to create your first receipt.</p>}
      </div>
      {selected && <GRNDetailPanel grn={selected} onClose={() => onSelect("")} loadGRNs={loadGRNs} onEdit={onEdit} />}
    </>
  );
}

// ─── GRN Detail Panel ─────────────────────────────────────────────────────────
function GRNDetailPanel({ grn, onClose, loadGRNs, onEdit }) {
  return (
    <div style={{ marginTop: 20, border: "1px solid #ddd", borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <span className="eyebrow">{grn.grnNumber}</span>
          <h3 style={{ margin: "8px 0" }}>{grn.purchaseOrder?.poNumber || "Manual Receipt"}</h3>
          <p className="muted">Supplier: {grn.purchaseOrder?.supplier?.name || "—"} · Status: <StatusBadge value={grn.status} /></p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {grn.status === "Pending" && onEdit && <button className="primary" type="button" onClick={() => onEdit(grn._id)} style={{ fontSize: 13 }}>Edit GRN</button>}
          <button className="secondary" type="button" onClick={onClose}>Close</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))", gap: 16, marginBottom: 20, padding: 16, background: "#f8f9fa", borderRadius: 6 }}>
        {[["Quarantine Sticker", grn.quarantineSticker || "—"], ["Approved Sticker", grn.approvedSticker || "—"],
          ["Quarantined At", grn.quarantinedAt ? new Date(grn.quarantinedAt).toLocaleString("en-IN") : "—"],
          ["Approved At", grn.approvedAt ? new Date(grn.approvedAt).toLocaleString("en-IN") : "—"]].map(([label, value]) => (
          <div key={label} className="grn-detail-row"><span className="grn-detail-label">{label}</span><span className="grn-detail-value">{value}</span></div>
        ))}
      </div>

      <h4 style={{ marginBottom: 12 }}>Items ({grn.items?.length || 0})</h4>
      <div className="table-wrap">
        <table style={{ fontSize: 13 }}>
          <thead><tr><th>Material</th><th>Ordered</th><th>Received</th><th>Unit</th><th>Batch</th><th>Invoice</th><th>Date</th><th>QC Status</th><th>Rejection</th></tr></thead>
          <tbody>
            {(grn.items || []).map((item, i) => (
              <tr key={i}>
                <td><b>{item.material?.name || "—"}</b></td>
                <td>{item.orderedQty}</td><td>{item.receivedQty}</td><td>{item.unit}</td>
                <td>{item.batchNumber || "—"}</td><td>{item.invoiceChallan || "—"}</td>
                <td>{item.receivedDate ? new Date(item.receivedDate).toLocaleDateString("en-IN") : "—"}</td>
                <td><StatusBadge value={item.qualityStatus} /></td>
                <td>{item.rejectionReason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── small helpers ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", required = false, ...props }) {
  return (
    <label className="field-label">
      {label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} {...props} />
    </label>
  );
}

function StatusBadge({ value }) {
  const map = {
    "Approved":           { bg: "#e6f2e7", color: "#27603b" },
    "Rejected":           { bg: "#fae7e5", color: "#a3332b" },
    "Quarantined":        { bg: "#fff0d1", color: "#795914" },
    "Under Testing":      { bg: "#fff8e1", color: "#795914" },
    "Pending":            { bg: "#f0f1ef", color: "#5a625c" },
    "Awaiting Delivery":  { bg: "#fff8e1", color: "#795914" },
    "Partially Received": { bg: "#e8f4fd", color: "#1a5c8c" },
    "Received":           { bg: "#e6f2e7", color: "#27603b" },
  };
  const s = map[value] || { bg: "#f0f1ef", color: "#5a625c" };
  return <span style={{ background: s.bg, color: s.color, padding: "4px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{value || "—"}</span>;
}

// ─── Send Email Modal ─────────────────────────────────────────────────────────
function SendEmailModal({ savedPO, form, emailHistory, onUpdateHistory, onClose }) {
  const poId = savedPO?.id || "";
  const supplierName = form.toAddress?.split("\n")[0]?.trim() || "Supplier";

  // ── local state ──
  const [toInput, setToInput]     = useState("");          // current text in the "To" input
  const [toList, setToList]       = useState([]);          // multiple recipients for this send
  const [subject, setSubject]     = useState(
    `Purchase Order ${poId} — Aroma Herbs Y Ayurvedic Industries`
  );
  const [message, setMessage]     = useState(
    `Dear ${supplierName},\n\nPlease find the Purchase Order ${poId} attached to this email.\n\nKindly acknowledge receipt and confirm the expected delivery date.\n\nRegards,\nAroma Herbs Y Ayurvedic Industries Pvt. Ltd.\nPlot No D-19, MIDC Industrial Area, Hingna, Nagpur\nPH: 09960954999`
  );
  const [inputError, setInputError] = useState("");

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── email validation ──
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  // Add an email to the toList (from input or from dropdown selection)
  function addEmail(raw) {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) { setInputError("Please enter a valid email address."); return; }
    if (toList.includes(email)) { setInputError("This address is already added."); return; }
    setInputError("");
    setToList(prev => [...prev, email]);
    setToInput("");

    // Persist to history if not already there
    if (!emailHistory.includes(email)) {
      const updated = [email, ...emailHistory].slice(0, 30); // keep max 30
      onUpdateHistory(updated);
    }
  }

  function removeEmail(email) {
    setToList(prev => prev.filter(e => e !== email));
  }

  function handleToKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(toInput);
    }
  }

  // ── open Gmail compose ──
  function openGmail() {
    if (toList.length === 0) { setInputError("Add at least one recipient."); return; }

    const to      = toList.join(",");
    const subEnc  = encodeURIComponent(subject);
    const bodyEnc = encodeURIComponent(message);

    // Gmail compose URL — opens in new tab with To, Subject, Body pre-filled
    // from=aromaherbal hints Gmail to use that account if the user is signed in with it
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${subEnc}&body=${bodyEnc}&authuser=accounts.google.com%2F`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  // ── styles (self-contained, no external CSS needed) ──
  const backdrop = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 200, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px 16px",
  };
  const modal = {
    background: "#fff", borderRadius: 16, width: "min(100%, 540px)",
    padding: 32, display: "flex", flexDirection: "column", gap: 20,
    boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
    maxHeight: "calc(100vh - 40px)", overflowY: "auto",
  };
  const labelStyle = {
    display: "flex", flexDirection: "column", gap: 7,
    fontSize: 13, fontWeight: 700, color: "#2d3b32",
  };
  const inputStyle = {
    height: 42, border: "1px solid #cbd6cc", borderRadius: 9,
    padding: "0 12px", background: "#fff", fontSize: 14,
    fontFamily: "inherit",
  };
  const tagStyle = {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#e4efe5", color: "#16452d", borderRadius: 99,
    padding: "4px 10px", fontSize: 12, fontWeight: 700,
  };

  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-label="Send PO via Email"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={modal}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#64736a" }}>
              PURCHASE ORDER · EMAIL
            </span>
            <h2 style={{ margin: "5px 0 0", fontSize: 20, color: "#1b2b25" }}>Send via Email</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#59675f" }}>
              Gmail compose will open in a new tab with the details pre-filled.
              Attach the printed PO PDF manually before sending.
            </p>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 22, color: "#7a8a7e",
              cursor: "pointer", lineHeight: 1, padding: 0, marginLeft: 12, flexShrink: 0 }}
          >×</button>
        </div>

        {/* ── To field ── */}
        <div style={labelStyle}>
          <span>To <span style={{ fontWeight: 500, color: "#7a8a7e" }}>(press Enter or comma to add)</span></span>

          {/* Tag list of added recipients */}
          {toList.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px",
              border: "1px solid #cbd6cc", borderRadius: 9, background: "#f7f9f6" }}>
              {toList.map(email => (
                <span key={email} style={tagStyle}>
                  {email}
                  <button type="button" onClick={() => removeEmail(email)}
                    style={{ background: "none", border: "none", color: "#16452d",
                      cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14, fontWeight: 800 }}
                    aria-label={`Remove ${email}`}
                  >×</button>
                </span>
              ))}
            </div>
          )}

          {/* Combo: datalist dropdown + free-type input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              list="email-history-list"
              value={toInput}
              onChange={e => { setToInput(e.target.value); setInputError(""); }}
              onKeyDown={handleToKeyDown}
              placeholder="Type or select an email address…"
              style={{ ...inputStyle, flex: 1 }}
              autoComplete="off"
            />
            <datalist id="email-history-list">
              {emailHistory.map(e => <option key={e} value={e} />)}
            </datalist>
            <button
              type="button" onClick={() => addEmail(toInput)}
              className="secondary"
              style={{ padding: "0 16px", height: 42, whiteSpace: "nowrap" }}
            >
              Add
            </button>
          </div>
          {inputError && (
            <span style={{ color: "#a3332b", fontSize: 12, fontWeight: 600 }}>{inputError}</span>
          )}
          {emailHistory.length > 0 && (
            <span style={{ fontSize: 11, color: "#7a8a7e" }}>
              Previously used addresses appear in the dropdown.
            </span>
          )}
        </div>

        {/* ── Subject ── */}
        <label style={labelStyle}>
          Subject
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={inputStyle}
            maxLength={200}
          />
        </label>

        {/* ── Message body ── */}
        <label style={labelStyle}>
          Message
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            maxLength={4000}
            style={{
              border: "1px solid #cbd6cc", borderRadius: 9,
              padding: "10px 12px", background: "#fff", fontSize: 13,
              lineHeight: 1.6, resize: "vertical", fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 11, color: "#7a8a7e", alignSelf: "flex-end" }}>
            {message.length}/4000
          </span>
        </label>

        {/* ── Attachment reminder ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fff8e8", border: "1px solid #ead8a6",
          borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#755718",
        }}>
          <span style={{ fontSize: 18 }}>📎</span>
          <span>
            <b>Remember to attach the PO.</b> Print the PO first, then attach the PDF
            manually in the Gmail compose window before sending.
          </span>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button
            type="button" className="primary"
            onClick={openGmail}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            ✉️ Open in Gmail
          </button>
        </div>

      </div>
    </div>
  );
}
