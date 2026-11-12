import { useMemo, useState } from "react";
import "../styles/quality-sticker.css";

export const DECISION_STICKER = {
  Approved: "APPROVED",
  "Under Testing": "UNDER TEST",
  Quarantine: "QUARANTINE",
  Rejected: "REJECTED",
};

const FIELD_SETS = {
  QUARANTINE: [
    ["material", "Name of Material"], ["receivedDate", "Dt. Of Recpt."], ["grnNo", "GRN No."],
    ["manufacturingDate", "Mfg. Dt."], ["expiryDate", "Exp. Dt."], ["quantity", "Qty."],
    ["containerNo", "Cont. No."], ["supplier", "Supp. By"], ["receivedBy", "Received By"],
  ],
  REJECTED: [
    ["material", "Name of Material"], ["receivedDate", "Dt. Of Recpt."], ["grnNo", "GRN No."],
    ["manufacturingDate", "Mfg. Dt."], ["expiryDate", "Exp. Dt."], ["quantity", "Qty."],
    ["containerNo", "Cont. No."], ["supplier", "Supp. By"], ["receivedBy", "Received By"],
  ],
  "UNDER TEST": [
    ["material", "Name of Material"], ["receivedDate", "Dt. Of Recpt."],
    ["manufacturingDate", "Mfg. Dt."], ["expiryDate", "Exp. Dt."], ["quantity", "Qty."],
    ["containerNo", "Cont. No."], ["arNo", "A.R. No."], ["supplier", "Supp. By"],
    ["sampleDate", "Sample Date"], ["sampleBy", "Sample By"],
  ],
  APPROVED: [
    ["material", "Name of Material"], ["arNo", "A.R. No."],
    ["manufacturingDate", "Mfg. Dt."], ["expiryDate", "Exp. Dt."], ["supplier", "Supp. By"],
    ["testReportNo", "Test Rep. No."], ["containerSampleNo", "Cont. Sample No."],
    ["approvedDate", "Approved Dt."], ["approvedBy", "Approved By"],
  ],
};

const dateForInput = (value = "") => value ? String(value).slice(0, 10) : "";
const DATE_FIELDS = new Set(["receivedDate", "manufacturingDate", "expiryDate", "sampleDate", "approvedDate"]);
const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const printableDate = (value = "") => {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function initialStickerValues(grn, user) {
  const currentDate = localToday();
  return {
    material: grn.material || "",
    receivedDate: dateForInput(grn.receivedDate),
    grnNo: grn.id || "",
    manufacturingDate: dateForInput(grn.manufacturingDate),
    expiryDate: dateForInput(grn.expiryDate),
    quantity: [grn.receivedQty, grn.unit].filter(Boolean).join(" "),
    containerNo: grn.containerNo || grn.batchNo || "",
    supplier: grn.supplier || "",
    receivedBy: grn.receivedBy || user?.name || "",
    arNo: grn.arNo || "",
    sampleDate: currentDate,
    sampleBy: user?.name || "",
    testReportNo: grn.testReportNo || "",
    containerSampleNo: grn.containerSampleNo || "",
    approvedDate: currentDate,
    approvedBy: user?.name || "",
  };
}

const PAIRS = {
  QUARANTINE: [["manufacturingDate", "expiryDate"]],
  REJECTED: [["manufacturingDate", "expiryDate"]],
  "UNDER TEST": [["manufacturingDate", "expiryDate"], ["quantity", "containerNo"]],
  APPROVED: [["manufacturingDate", "expiryDate"]],
};

function arrangeRows(stickerType, lines) {
  const consumed = new Set();
  const pairs = PAIRS[stickerType] || [];
  return lines.flatMap((line) => {
    if (consumed.has(line.key)) return [];
    const pair = pairs.find((keys) => keys.includes(line.key));
    if (!pair) {
      consumed.add(line.key);
      return [{ type: "single", cells: [line] }];
    }
    const cells = pair.map((key) => lines.find((item) => item.key === key)).filter(Boolean);
    cells.forEach((cell) => consumed.add(cell.key));
    return [{ type: "pair", cells }];
  });
}

export default function QualitySticker({ grn, decision, user, onPrint }) {
  const stickerType = DECISION_STICKER[decision];
  const fieldSet = FIELD_SETS[stickerType] || [];
  const [values, setValues] = useState(() => initialStickerValues(grn, user));
  const [storageLocation, setStorageLocation] = useState(grn.storageLocation || "");
  const [printError, setPrintError] = useState("");
  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const complete = fieldSet.every(([key]) => String(values[key] ?? "").trim());
  // For Approved stickers, also require a storage location
  const approvedReady = stickerType !== "APPROVED" || storageLocation.trim().length > 0;
  const readyToPrint = complete && approvedReady;
  const lines = useMemo(() => fieldSet.map(([key, label]) => ({ key, label, value: printableDate(values[key]) })), [fieldSet, values]);
  const rows = useMemo(() => arrangeRows(stickerType, lines), [stickerType, lines]);

  const handlePrint = async () => {
    if (!readyToPrint) return;
    setPrintError("");

    // Save to backend first — wait for it to complete before opening the popup
    try {
      await onPrint({ stickerType, stickerData: values, storageLocation: storageLocation.trim() });
    } catch {
      // Error is already shown by the parent (applyDecision sets its own message)
      // Still continue to print the sticker so the user has the physical copy
    }

    const popup = window.open("", "_blank", "width=480,height=360");
    if (!popup) {
      setPrintError("Allow pop-ups to print the sticker.");
      return;
    }
    popup.document.open();
    popup.document.write(buildPrintDocument(stickerType, rows));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 350);
  };

  return (
    <div className="sticker-editor">
      <div className="sticker-editor-fields">
        <div className="section-heading">
          <h3>{stickerType} sticker details</h3>
          <span>{readyToPrint ? "Ready to print" : "Complete required fields"}</span>
        </div>
        <div className="sticker-input-grid">
          {fieldSet.map(([key, label]) => (
            <label className="field-label" key={key}>
              {label}
              <input
                type={DATE_FIELDS.has(key) ? "date" : "text"}
                value={values[key] || ""}
                onChange={(event) => setValue(key, event.target.value)}
                placeholder={label}
              />
            </label>
          ))}
        </div>

        {/* Storage location — only shown for APPROVED decisions */}
        {stickerType === "APPROVED" && (
          <div className="sticker-storage-row">
            <label className="field-label">
              Storage Location <span style={{ color: "#a3332b" }}>*</span>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g. Raw Material · Shelf A-04"
              />
            </label>
            <p className="sticker-storage-hint">
              Required for Approved decisions — this location is saved with the GRN and shown in the inventory report.
            </p>
          </div>
        )}

        {printError && <p className="order-message" role="alert">{printError}</p>}
        <button className="primary" type="button" onClick={handlePrint} disabled={!readyToPrint}>
          Print {stickerType} sticker{stickerType === "APPROVED" ? " · Add to Inventory" : ""}
        </button>
        {!readyToPrint && (
          <small className="muted">
            {!complete
              ? "Fill in all required sticker fields to enable printing."
              : "Enter a storage location to enable printing."}
          </small>
        )}
      </div>
      <div className="sticker-preview-wrap">
        <p className="eyebrow">STICKER PREVIEW · 3 × 2 IN (ESTIMATE)</p>
        <StickerMarkup title={stickerType} rows={rows} />
      </div>
    </div>
  );
}

function StickerMarkup({ title, rows }) {
  return <div className="quality-sticker-preview">
    <div className="quality-sticker-company">Aroma Herbs &amp; Ayurvedic Industries Pvt. Ltd. Nagpur</div>
    <div className="quality-sticker-title">{title}</div>
    <div className="quality-sticker-fields">{rows.map((row, index) => <div className={`quality-sticker-line ${row.type}`} key={`${row.cells[0].key}-${index}`}>
      {row.cells.map((cell) => <span className="quality-sticker-cell" key={cell.key}><span>{cell.label}:</span><b>{cell.value}</b></span>)}
    </div>)}</div>
    <div className="quality-sticker-format">FORMAT No.: QCD/001</div>
  </div>;
}

function buildPrintDocument(title, rows) {
  const htmlRows = rows.map((row) => `<div class="line ${row.type}">${row.cells.map((cell) => `<span class="cell"><span>${escapeHTML(cell.label)}:</span><b>${escapeHTML(cell.value)}</b></span>`).join("")}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(title)} sticker</title><style>
    @page{size:76.2mm auto;margin:0}
    *{box-sizing:border-box}
    html,body{width:76.2mm;margin:0;padding:0;font-family:Georgia,"Times New Roman",serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .label{width:76.2mm;min-height:50.8mm;border:.55mm solid #111;display:flex;flex-direction:column}
    .company{border-bottom:.45mm solid #111;text-align:center;font-size:7pt;font-weight:bold;line-height:1.3;padding:1mm 1.5mm;white-space:normal;word-break:break-word}
    .title{border-bottom:.45mm solid #111;text-align:center;font-size:15pt;font-weight:bold;padding:1.2mm 1mm;line-height:1.2}
    .fields{flex:1;padding:1.5mm 2mm;display:flex;flex-direction:column;gap:1.5mm;font-size:8pt;line-height:1.3}
    .line{display:grid;grid-template-columns:1fr}
    .line.pair{grid-template-columns:1fr 1fr;gap:2mm}
    .cell{display:grid;grid-template-columns:26mm 1fr;min-width:0;gap:1mm}
    .line.pair .cell{grid-template-columns:14mm 1fr}
    .cell span{font-weight:bold;font-size:7.5pt;white-space:nowrap}
    .cell b{font-weight:normal;word-break:break-word;overflow-wrap:anywhere}
    .footer{border-top:.45mm solid #111;padding:1mm 1.5mm;font-size:8pt;line-height:1.4}
    @media print{html,body{width:76.2mm}}
  </style></head><body><div class="label"><div class="company">Aroma Herbs &amp; Ayurvedic Industries Pvt. Ltd. Nagpur</div><div class="title">${escapeHTML(title)}</div><div class="fields">${htmlRows}</div><div class="footer">FORMAT No.: QCD/001</div></div></body></html>`;
}