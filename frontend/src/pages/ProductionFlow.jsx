import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Factory, Printer } from "lucide-react";
import { useGRNs } from "../context/GRNContext.jsx";
import api from "../services/api.js";
import "../styles/production-flow.css";

const ERROR_LIMIT = 5;
const today = () => new Date().toISOString().slice(0, 10);
const getErrorLimit = (value) => value !== "" && Number.isFinite(Number(value)) ? Number(value) : ERROR_LIMIT;
const mkLine = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, key: "", quantity: "" });
const fmtDate = (value) => value ? new Date(value).toLocaleString() : "—";
const itemKey = (row) => `${row.category}::${row.material}::${row.unit}`;

export default function ProductionFlow({ user }) {
  const { productionBatches, inventoryMovements, createProductionBatch, updateProductionBatch } = useGRNs();
  const [stockBalances, setStockBalances] = useState([]);   // live from backend
  const [addingToInv, setAddingToInv] = useState(false);     // adding to finished goods inventory
  const stock = useMemo(() => stockBalances.map(b => ({
    key: `${b.category}::${b.name}::${b.unit}`,
    category: b.category,
    material: b.name,
    unit: b.unit,
    quantity: b.usableStock,
    materialId: b.materialId,
  })).sort((a, b) => a.material.localeCompare(b.material)), [stockBalances]);
  const [selectedId, setSelectedId] = useState(""); const [message, setMessage] = useState(""); const [filter, setFilter] = useState("All batches"); const [activePage, setActivePage] = useState("dashboard");
  const [bmrPage, setBmrPage] = useState(2);

  useEffect(() => {
    api.get("/inventory/stock-balances?limit=500")
      .then(res => setStockBalances(res.items || []))
      .catch(() => {});
  }, []);
  const [plan, setPlan] = useState({ product: "", target: "", date: today(), shift: "Day", machine: "", productionManager: "", packagingKey: "", packagingQty: "", errorLimit: "5", batchNo: "", arNo: "", productCode: "", mfgDate: "", expDate: "", completedDate: "", section: "", pageNo: "1 of 8", productionChemist: "", authorisedSignatory: "" });
  const [formula, setFormula] = useState([mkLine()]);

  // ── BMR sub-page data states ───────────────────────────────────────────────
  const mkDispRow = () => ({ id: `d${Date.now()}-${Math.random().toString(36).slice(2,5)}`, name: "", arNo: "", qtyIssued: "", issuedBy: "", receivedBy: "" });
  const mkMatRow  = () => ({ id: `m${Date.now()}-${Math.random().toString(36).slice(2,5)}`, name: "", materialId: "", qty100: "", qtyIssued: "", qtyUsed: "", checkBy: "" });
  const mkFillRow = () => ({ id: `f${Date.now()}-${Math.random().toString(36).slice(2,5)}`, date: today(), machine: "", operator: "", worker: "", qtyFilled: "" });
  const mkLblRow  = () => ({ id: `l${Date.now()}-${Math.random().toString(36).slice(2,5)}`, date: today(), worker: "", labelledQty: "" });
  const mkPkgRow  = () => ({ id: `p${Date.now()}-${Math.random().toString(36).slice(2,5)}`, date: today(), worker: "", packedQty: "" });

  const [p2, setP2] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "2 of 8", prodChemist: "", prodManager: "", authSign: "", rows: [mkDispRow(), mkDispRow(), mkDispRow(), mkDispRow(), mkDispRow()] });
  const [p3, setP3] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "3 of 8", prodChemist: "", prodManager: "", authSign: "", rows: [mkMatRow(), mkMatRow(), mkMatRow(), mkMatRow(), mkMatRow()] });
  const [p4, setP4] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "4 of 8", prodChemist: "", prodManager: "", authSign: ""});
  const [p5, setP5] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "5 of 8", prodChemist: "", prodManager: "", authSign: "", batchFillingDate: "", totalTubesFilled: "", rows: [mkFillRow(), mkFillRow(), mkFillRow(), mkFillRow(), mkFillRow()] });
  const [p6, setP6] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "6 of 8", prodChemist: "", prodManager: "", authSign: "",
    sampleQty: "", samplingBy: "",
    appearance: { spec: "", obs: "", result: "" },
    color:      { spec: "Off white cream", obs: "", result: "" },
    odour:      { spec: "Pleasant", obs: "", result: "" },
    ph:         { spec: "4-9", obs: "", result: "" },
    viscosity:  { spec: "", obs: "", result: "" },
    remarks: ""
  });
  const [p7, setP7] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "7 of 8", prodChemist: "", prodManager: "", authSign: "",
    lblRows: [mkLblRow(), mkLblRow()], totalLabelledQty: "",
    pkgRows: [mkPkgRow(), mkPkgRow()], totalPackedQty: "",
    inProcessSample: "", sampleAnalysis: "", controlSample: "", totalBoxes: "", totalQtyPacked: "", totalTransferred: ""
  });
  const [p8, setP8] = useState({ productName: "", batchNo: "", batchSize: "", mfgDate: "", expDate: "", date: today(), pageNo: "8 of 8", prodChemist: "", prodManager: "", authSign: "", specimenNote: "" });
  const mkTestRow = (name, spec = "") => ({ name, spec, obs: "", result: "" });
  const [coa, setCoa] = useState({ productName: "", batchNo: "", arNo: "", mfgDate: "", dateOfAnalysis: today(), productCode: "", batchSize: "", expDate: "", qualityReleaseDt: "",
    analyzedBy: "", approvedBy: "",
    tests: [
      mkTestRow("Appearance/Description"), mkTestRow("Homogeneity"), mkTestRow("pH"),
      mkTestRow("Total Fatty Matter"), mkTestRow("Thermal Stability"), mkTestRow("Total Solid Residue"),
      mkTestRow("Heavy Metals"), mkTestRow("Arsenic"), mkTestRow("Total Ash")
    ]
  });
  // ─────────────────────────────────────────────────────────────────────────
  const selected = productionBatches.find((row) => row.id === selectedId);
  const getItem = (key) => stock.find((row) => row.key === key);
  const ingredients = formula.filter((line) => line.key && Number(line.quantity) > 0).map((line) => ({ ...getItem(line.key), id: line.id, quantity: Number(line.quantity) }));
  const packageItem = getItem(plan.packagingKey);
  const requirements = [...ingredients];
  if (packageItem && Number(plan.packagingQty) > 0) requirements.push({ ...packageItem, id: `pack-${packageItem.key}`, quantity: Number(plan.packagingQty) });
  const setPlanField = (key, value) => setPlan((current) => ({ ...current, [key]: value }));
  const openBatch = (row) => {
    setSelectedId(row.id); setMessage("");
    setBmrPage(row.bmrPage || 2);
    setPlan({ product: row.product, target: String(row.target), date: row.date, shift: row.shift, machine: row.machine, productionManager: row.productionManager || "", packagingKey: row.packagingKey || "", packagingQty: String(row.packagingQty || ""), errorLimit: String(row.errorLimit ?? ERROR_LIMIT), batchNo: row.batchNo || "", arNo: row.arNo || "", productCode: row.productCode || "", mfgDate: row.mfgDate || "", expDate: row.expDate || "", completedDate: row.completedDate || "", section: row.section || "", pageNo: row.pageNo || "1 of 8", productionChemist: row.productionChemist || "", authorisedSignatory: row.authorisedSignatory || "" });
    setFormula((row.materials || []).map((line) => ({ id: line.id || mkLine().id, key: itemKey(line), quantity: String(line.quantity) })) || [mkLine()]);

    // Build the shared header from saved batch fields so re-opened batches also get pre-filled
    const batchHdr = {
      productName: row.product || "",
      batchNo:     row.batchNo || "",
      batchSize:   String(row.target || ""),
      mfgDate:     row.mfgDate || "",
      expDate:     row.expDate || "",
      date:        row.date || today(),
      prodChemist: row.productionChemist || "",
      prodManager: row.productionManager || "",
      authSign:    row.authorisedSignatory || "",
    };

    // Reset or load BMR page data - always set to prevent carryover from previous batch
    // When no saved data, fall back to header-pre-filled defaults
    setP2(row.p2Data || { ...batchHdr, pageNo: "2 of 8", rows: [mkDispRow(), mkDispRow(), mkDispRow(), mkDispRow(), mkDispRow()] });
    setP3(row.p3Data || { ...batchHdr, pageNo: "3 of 8", rows: [mkMatRow(), mkMatRow(), mkMatRow(), mkMatRow(), mkMatRow()] });
    setP4(row.p4Data || { ...batchHdr, pageNo: "4 of 8",});
    setP5(row.p5Data || { ...batchHdr, pageNo: "5 of 8", batchFillingDate: "", totalTubesFilled: "", rows: [mkFillRow(), mkFillRow(), mkFillRow(), mkFillRow(), mkFillRow()] });
    setP6(row.p6Data || { ...batchHdr, pageNo: "6 of 8",
      sampleQty: "", samplingBy: "",
      appearance: { spec: "", obs: "", result: "" },
      color:      { spec: "Off white cream", obs: "", result: "" },
      odour:      { spec: "Pleasant", obs: "", result: "" },
      ph:         { spec: "4-9", obs: "", result: "" },
      viscosity:  { spec: "", obs: "", result: "" },
      remarks: ""
    });
    setP7(row.p7Data || { ...batchHdr, pageNo: "7 of 8",
      lblRows: [mkLblRow(), mkLblRow()], totalLabelledQty: "",
      pkgRows: [mkPkgRow(), mkPkgRow()], totalPackedQty: "",
      inProcessSample: "", sampleAnalysis: "", controlSample: "", totalBoxes: "", totalQtyPacked: "", totalTransferred: ""
    });
    setP8(row.p8Data || { ...batchHdr, pageNo: "8 of 8", specimenNote: "" });
    setCoa(row.coaData || { productName: batchHdr.productName, batchNo: batchHdr.batchNo, arNo: row.arNo || "", mfgDate: batchHdr.mfgDate, dateOfAnalysis: today(), productCode: row.productCode || "", batchSize: batchHdr.batchSize, expDate: batchHdr.expDate, qualityReleaseDt: "",
      analyzedBy: "", approvedBy: "",
      tests: [
        mkTestRow("Appearance/Description"), mkTestRow("Homogeneity"), mkTestRow("pH"),
        mkTestRow("Total Fatty Matter"), mkTestRow("Thermal Stability"), mkTestRow("Total Solid Residue"),
        mkTestRow("Heavy Metals"), mkTestRow("Arsenic"), mkTestRow("Total Ash")
      ]
    });
    
  };
  const createPlan = (event) => {
    event.preventDefault(); setMessage("");
    if (!plan.product.trim() || Number(plan.target) <= 0 || !plan.date) {return;}
    const short = requirements.find((line) => line.quantity > (stock.find((item) => item.key === itemKey(line))?.quantity || 0));
    if (short) { setMessage(`${short.material}: required ${short.quantity} ${short.unit}, but only ${stock.find((item) => item.key === itemKey(short))?.quantity || 0} is available.`); return; }
    const row = createProductionBatch({ product: plan.product.trim(), target: Number(plan.target), date: plan.date, shift: plan.shift, machine: plan.machine.trim(), productionManager: plan.productionManager.trim(), packagingKey: plan.packagingKey, packagingQty: Number(plan.packagingQty) || 0, errorLimit: getErrorLimit(plan.errorLimit), materials: requirements, createdBy: user?.name || "", batchNo: plan.batchNo || "", arNo: plan.arNo || "", productCode: plan.productCode || "", mfgDate: plan.mfgDate || "", expDate: plan.expDate || "", completedDate: plan.completedDate || "", section: plan.section || "", pageNo: plan.pageNo || "1 of 8", productionChemist: plan.productionChemist || "", authorisedSignatory: plan.authorisedSignatory || "", bmrPage: 2, status: "Planned" });
    openBatch(row); setActivePage("workflow"); setBmrPage(2);

    // Pre-fill the shared header fields on all BMR pages from Page 1 data
    const hdr = {
      productName:  plan.product.trim(),
      batchNo:      plan.batchNo || "",
      batchSize:    String(plan.target || ""),
      mfgDate:      plan.mfgDate || "",
      expDate:      plan.expDate || "",
      date:         plan.date || today(),
      prodChemist:  plan.productionChemist || "",
      prodManager:  plan.productionManager || "",
      authSign:     plan.authorisedSignatory || "",
    };
    setP2(x => ({ ...x, ...hdr, pageNo: "2 of 8" }));
    setP3(x => ({ ...x, ...hdr, pageNo: "3 of 8" }));
    setP4(x => ({ ...x, ...hdr, pageNo: "4 of 8" }));
    setP5(x => ({ ...x, ...hdr, pageNo: "5 of 8" }));
    setP6(x => ({ ...x, ...hdr, pageNo: "6 of 8" }));
    setP7(x => ({ ...x, ...hdr, pageNo: "7 of 8" }));
    setP8(x => ({ ...x, ...hdr, pageNo: "8 of 8" }));

    setMessage("Page 1 saved. Header fields copied to all pages — continue filling the remaining BMR pages.");
  };

  // Save handlers for sub-pages 2-9
  const saveP2 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p2Data: p2, bmrPage: 3, updatedBy: user?.name }, "BMR Page 2 (Batch Dispensing) saved"); setBmrPage(3); setMessage("Page 2 saved."); };
  const saveP3 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p3Data: p3, bmrPage: 4, updatedBy: user?.name }, "BMR Page 3 (Material Issue) saved"); setBmrPage(4); setMessage("Page 3 saved."); };
  const saveP4 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p4Data: p4, bmrPage: 5, updatedBy: user?.name }, "BMR Page 4 (Manufacturing Procedure) saved"); setBmrPage(5); setMessage("Page 4 saved."); };
  const saveP5 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p5Data: p5, bmrPage: 6, updatedBy: user?.name }, "BMR Page 5 (Filling Record) saved"); setBmrPage(6); setMessage("Page 5 saved."); };
  const saveP6 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p6Data: p6, bmrPage: 7, updatedBy: user?.name }, "BMR Page 6 (In Process Checks) saved"); setBmrPage(7); setMessage("Page 6 saved."); };
  const saveP7 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p7Data: p7, bmrPage: 8, updatedBy: user?.name }, "BMR Page 7 (Labelling & Packing) saved"); setBmrPage(8); setMessage("Page 7 saved."); };
  const saveP8 = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { p8Data: p8, bmrPage: 9, updatedBy: user?.name }, "BMR Page 8 (Specimen Labels) saved"); setBmrPage(9); setMessage("Page 8 saved."); };
  const saveCoa = (e) => { e.preventDefault(); updateProductionBatch(selected.id, { coaData: coa, bmrPage: 10, status: "BMR Ready", updatedBy: user?.name }, "Certificate of Analysis saved; BMR complete — print the BMR"); setBmrPage(10); setMessage("Certificate of Analysis saved. BMR complete — print the BMR."); };
  const printBMR = () => { updateProductionBatch(selected.id, { bmrPrintedAt: new Date().toISOString(), updatedBy: user?.name }, "BMR printed"); setTimeout(() => window.print(), 0); };

  const addToInventory = async () => {
    if (!selected) return;

    // Use selected or plan as fallback for fields
    const productName = (selected.product || plan.product || "").trim();
    const producedQty = Number(selected.actualProduced) || Number(selected.target) || Number(plan.target) || 0;

    if (!productName) {
      setMessage("Product name is missing. Please ensure the batch has a product name.");
      return;
    }
    if (producedQty <= 0) {
      setMessage("Quantity must be greater than zero. Please ensure the batch has a target quantity.");
      return;
    }

    setAddingToInv(true);
    setMessage("");
    try {
      const result = await api.post("/finished-goods/from-bmr", {
        productName,
        bmrNumber: selected.id,
        productCode: selected.productCode || plan.productCode || "",
        producedQuantity: producedQty,
        rejectedQuantity: 0,
        unit: "units",
      });
      updateProductionBatch(selected.id, { addedToInventory: true, fgLotNumber: result.lotNumber, updatedBy: user?.name }, "Added to finished goods inventory");
      setMessage(`✅ Added to finished goods as ${result.lotNumber}. It is now available for dispatch.`);
    } catch (err) {
      const details = err?.data?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        setMessage("Validation error: " + details.map((d) => `${d.field}: ${d.message}`).join("; "));
      } else {
        setMessage(err?.data?.message || err?.message || "Failed to add to inventory.");
      }
    } finally {
      setAddingToInv(false);
    }
  };

  const close = () => { setSelectedId(""); setMessage(""); };
  const todayBatches = productionBatches.filter((row) => row.date === today());
  const plannedToday = todayBatches.reduce((sum, row) => sum + (Number(row.target) || 0), 0);
  const batchesForFilter = productionBatches.filter((row) => filter === "All batches" || row.status === filter);

  return <div className="production-flow">
    <div className="welcome-strip"><div><span className="eyebrow">PRODUCTION MANAGEMENT</span><h2>Plan, run and review batches</h2><p>Plans, BMRs, output, quality decisions and actions are saved in this browser.</p></div><div className="strip-icon"><Factory size={27} /></div></div>
    <div className="production-page-tabs" role="tablist" aria-label="Production In-charge pages"><button type="button" role="tab" aria-selected={activePage === "dashboard"} className={activePage === "dashboard" ? "active" : ""} onClick={() => { setActivePage("dashboard"); setMessage(""); }}>Dashboard &amp; Reports</button><button type="button" role="tab" aria-selected={activePage === "workflow"} className={activePage === "workflow" ? "active" : ""} onClick={() => { setActivePage("workflow"); setMessage(""); }}>Production Workflow</button></div>
    {activePage === "dashboard" && <>
    <div className="production-summary"><Summary label="Planned today" value={plannedToday.toLocaleString()} /></div>
    <ProductionReports batches={productionBatches} movements={inventoryMovements}/>
    </>}
    {activePage === "workflow" && <> 
    
      
    {!selected && <div className="production-workspace">
      <aside className="production-workflow-rail"><SectionTitle number="1" title="Production plan" text="Start with product, target, shift, machine and required stock."/><section className="panel production-register"><div className="section-heading"><div><h2>Batch register</h2><p className="muted">Open a plan to create its BMR and advance production.</p></div><label className="production-filter">Filter<select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All batches</option>{[...new Set(productionBatches.map((row) => row.status))].map((status) => <option key={status}>{status}</option>)}</select></label></div>
        {batchesForFilter.length ? <div className="table-wrap"><table><thead><tr><th>Batch / BMR</th><th>Product</th><th>Target</th><th>Output</th><th>Shift / Machine</th><th>Status</th><th></th></tr></thead><tbody>{batchesForFilter.map((row) => <tr key={row.id}><td><b>{row.id}</b><small className="production-cell-sub">{row.date} · {row.shift}</small></td><td>{row.product}</td><td>{row.target}</td><td>{row.actualProduced || 0}</td><td>{row.shift} · {row.machine}</td><td><Status value={row.status}/></td><td><button className="secondary" onClick={() => openBatch(row)}>Open</button></td></tr>)}</tbody></table></div> : <p className="empty-state">No batches for this filter.</p>}
      </section></aside>
      <main className="production-current-step"><section className="panel production-plan-panel">
        <SectionTitle number="1" title="Batch Manufacturing Record — Cover Page" text="Fill in all details exactly as they appear on the physical BMR. Click Save & Continue to proceed to the next step." />
        <form onSubmit={createPlan}>

          {/* ── BMR Document Header ── */}
          <div className="bmr-cover-doc">

            {/* Company header */}
            <div className="bmr-cover-header">
              <div className="bmr-cover-company">
                <img src="/aroma-logo.png" alt="Aroma logo" className="bmr-cover-logo" />
                <div>
                  <b>Aroma Herbs &amp; Ayurvedic Industries Pvt. Ltd.</b>
                  <span>D-19, MIDC, Industrial Area, Hingna, Nagpur- 44016</span>
                </div>
              </div>
              <div className="bmr-cover-title-box">BATCH MANUFACTURING RECORD</div>
            </div>

            {/* Editable fields table — mirrors the physical form */}
            <table className="bmr-cover-table">
              <tbody>
                <tr>
                  <th>Name of Product</th>
                  <td colSpan="3">
                    <input
                      className="bmr-cover-input"
                      value={plan.product}
                      onChange={(e) => setPlanField("product", e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <th>Batch No.</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.batchNo || ""}
                      onChange={(e) => setPlanField("batchNo", e.target.value)}
                      placeholder="e.g. BMR-2026-001"
                    />
                  </td>
                  <th>Batch Size</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      type="text"
                      step="any"
                      value={plan.target}
                      onChange={(e) => setPlanField("target", e.target.value)}
                      placeholder="e.g. 5000 pcs"
                      required
                    />
                  </td>
                </tr>
                <tr>
                  <th>Batch Started Date</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      type="date"
                      value={plan.date}
                      onChange={(e) => setPlanField("date", e.target.value)}
                      required
                    />
                  </td>
                  <th>Batch Completed Date</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      type="date"
                      value={plan.completedDate || ""}
                      onChange={(e) => setPlanField("completedDate", e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th>A.R. No.</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.arNo || ""}
                      onChange={(e) => setPlanField("arNo", e.target.value)}
                      placeholder="Analytical Report No."
                    />
                  </td>
                  <th>Product Code</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.productCode || ""}
                      onChange={(e) => setPlanField("productCode", e.target.value)}
                      placeholder="e.g. FG-3012"
                    />
                  </td>
                </tr>
                <tr>
                  <th>Mfg. Date</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      type="date"
                      value={plan.mfgDate || ""}
                      onChange={(e) => setPlanField("mfgDate", e.target.value)}
                    />
                  </td>
                  <th>Exp. Date</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      type="date"
                      value={plan.expDate || ""}
                      onChange={(e) => setPlanField("expDate", e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th>Section</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.section || ""}
                      onChange={(e) => setPlanField("section", e.target.value)}
                      placeholder="e.g. Production"
                    />
                  </td>
                  <th>Page No.</th>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.pageNo || "1 of 8"}
                      onChange={(e) => setPlanField("pageNo", e.target.value)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Instruction Control and Safety Precaution */}
            <div className="bmr-cover-section">
              <div className="bmr-cover-section-title">INSTRUCTION CONTROL AND SAFETY PRECAUTION</div>
              <ol className="bmr-cover-list">
                <li>Wear safety goggle, rubber hand gloves, organic vapour mask, apron while handling of raw material.</li>
                <li>Use earthen and bonding while transferring the solvent. Points exhaust shall be used while charging solid material.</li>
                <li>Ensure that the Equipment's used during the course of manufacture are earthen properly.</li>
                <li>Before charging the raw materials into the tank check the labels on the containers and ensure they are approved and well within the rest period.</li>
                <li>During the course of batch processing, comply with the limits as mentioned in the Batch Production and control record. Send In-process sample to QC along with in-process analysis request.</li>
                <li>All critical parameters are highlighted by bold letters.</li>
              </ol>
            </div>

            {/* GMP Instructions */}
            <div className="bmr-cover-section">
              <div className="bmr-cover-section-title">GMP INSTRUCTIONS</div>
              <p className="bmr-cover-gmp-intro">Following GMP instruction shall be followed during manufacturing of batch.</p>
              <ol className="bmr-cover-list">
                <li>All precaution must be taken to avoid contamination.</li>
                <li>Ensure that the instructions in BPCR are followed and all operations are carried out by trained operators.</li>
                <li>Ensure all the documents and records are complete as per written instruction.</li>
                <li>Cleaning and verification of minor equipment and utensil shall be recorded.</li>
                <li>Equipment cleaning and equipment status shall be updated as soon as status of equipment changes.</li>
              </ol>
            </div>

            {/* Signature row */}
            <table className="bmr-cover-sign-table">
              <thead>
                <tr>
                  <th>Prepared By</th>
                  <th>Reviewed By</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.productionChemist || ""}
                      onChange={(e) => setPlanField("productionChemist", e.target.value)}
                      placeholder="Name"
                    />
                  </td>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.productionManager || ""}
                      onChange={(e) => setPlanField("productionManager", e.target.value)}
                      placeholder="Production Manager name"
                    />
                  </td>
                  <td>
                    <input
                      className="bmr-cover-input"
                      value={plan.authorisedSignatory || ""}
                      onChange={(e) => setPlanField("authorisedSignatory", e.target.value)}
                      placeholder="Name"
                    />
                  </td>
                </tr>
                <tr className="bmr-sign-spacer">
                  <td /><td /><td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Material Requirements Section ── */}
          <div className="bmr-cover-section" style={{ marginTop: '24px' }}>
            <div className="bmr-cover-section-title">MATERIAL REQUIREMENTS</div>
            <p className="bmr-cover-gmp-intro">Select materials from approved inventory that will be consumed for this batch.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {formula.map((line, index) => (
                <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                  <select
                    className="bmr-cover-input"
                    value={line.key}
                    onChange={(e) => {
                      const newFormula = [...formula];
                      newFormula[index] = { ...line, key: e.target.value };
                      setFormula(newFormula);
                    }}
                  >
                    <option value="">Select material from inventory...</option>
                    {stock.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.material} ({item.quantity} {item.unit} available)
                      </option>
                    ))}
                  </select>
                  <input
                    className="bmr-cover-input"
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Quantity"
                    value={line.quantity}
                    onChange={(e) => {
                      const newFormula = [...formula];
                      newFormula[index] = { ...line, quantity: e.target.value };
                      setFormula(newFormula);
                    }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (formula.length > 1) {
                        setFormula(formula.filter((_, i) => i !== index));
                      }
                    }}
                    style={{ padding: '8px 12px' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              className="secondary"
              onClick={() => setFormula([...formula, mkLine()])}
              style={{ marginBottom: '12px' }}
            >
              + Add Material
            </button>

            {ingredients.length > 0 && (
              <div style={{ background: '#f7f9f6', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                <b style={{ fontSize: '13px', color: '#2d3b32' }}>Selected materials:</b>
                <ul style={{ margin: '8px 0 0', padding: '0 0 0 20px', fontSize: '13px', color: '#59675f' }}>
                  {ingredients.map((item) => (
                    <li key={item.id}>
                      {item.material}: {item.quantity} {item.unit}
                      {item.quantity > item.quantity ? (
                        <span style={{ color: '#b83932', marginLeft: '8px' }}>
                          (Only {item.quantity} {item.unit} available!)
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {message && <p className="order-message" style={{ marginTop: 14 }}>{message}</p>}
          <div className="bmr-cover-actions">
            <button className="primary" type="submit"><ArrowRight size={16} /> Save &amp; Continue</button>
          </div>
        </form>
      </section></main>
    </div>}
    {selected && <div className="production-workspace">
      <aside className="production-workflow-rail">
        <div className="production-workflow-heading"><div><span className="eyebrow">ACTIVE BATCH · {selected.id}</span><h2>{selected.product}</h2><p>{selected.date} · {selected.shift} · target {selected.target}</p></div><Status value={selected.status}/></div>
        <div className="production-vertical-steps">{["BMR Page 1 · Cover","BMR Page 2 · Dispensing","BMR Page 3 · Material Issue","BMR Page 4 · Procedure","BMR Page 5 · Filling","BMR Page 6 · In-Process","BMR Page 7 · Labelling","BMR Page 8 · Specimen","Certificate of Analysis","Print BMR"].map((label,i)=>{const pg=selected.bmrPage||2;const done=[true,pg>2,pg>3,pg>4,pg>5,pg>6,pg>7,pg>8,pg>9,Boolean(selected.bmrPrintedAt)][i];return <div key={label} className={done?"done":""}><span>{done?"✓":i+1}</span><small>{label}</small></div>;})}</div>
        <div className="production-rail-summary"><b>{selected.machine}</b><span>Target: {selected.target}</span><span>Produced: {selected.actualProduced||0}</span><Status value={selected.status}/></div>
        <button className="secondary production-back-button" onClick={close}>Back to batch register</button>
      </aside>
      <main className="production-current-step">
      {message && <div className="production-message" role="status">{message}</div>}
      {selected.status === "Planned" && <BmrSubPages bmrPage={bmrPage} setBmrPage={setBmrPage} selected={selected} p2={p2} setP2={setP2} p3={p3} setP3={setP3} p4={p4} setP4={setP4} p5={p5} setP5={setP5} p6={p6} setP6={setP6} p7={p7} setP7={setP7} p8={p8} setP8={setP8} coa={coa} setCoa={setCoa} saveP2={saveP2} saveP3={saveP3} saveP4={saveP4} saveP5={saveP5} saveP6={saveP6} saveP7={saveP7} saveP8={saveP8} saveCoa={saveCoa} message={message} mkDispRow={mkDispRow} mkMatRow={mkMatRow} mkFillRow={mkFillRow} mkLblRow={mkLblRow} mkPkgRow={mkPkgRow} materials={selected.materials || []} stockBalances={stockBalances} user={user} />}
      {selected.status === "BMR Ready" && <section className="panel production-step-panel"><SectionTitle number="10" title="Print BMR" text="Your BMR is complete. Print and attach the batch manufacturing record."/>{(selected.attachments||[]).length>0&&<div className="bmr-attachment-list">{selected.attachments.map((doc,index)=><a key={`${doc.name}-${index}`} href={doc.data} download={doc.name}>{doc.name}</a>)}</div>}<button className="primary" onClick={printBMR}><Printer size={16}/> Print BMR · A4</button>{selected.bmrPrintedAt && <button className="secondary" onClick={addToInventory} disabled={addingToInv||selected.addedToInventory} style={{display:"inline-flex",alignItems:"center",gap:8}}>{selected.addedToInventory?"\u2705 Added to Inventory":addingToInv?"Adding\u2026":"\uD83D\uDCE6 Add to Inventory"}</button>}</section>}
      <section className="panel production-batch-summary"><h3>Batch summary</h3><div className="production-summary-grid"><Summary label="BMR printed" value={fmtDate(selected.bmrPrintedAt)}/></div></section>
      </main>
    </div>}
    </>}
    <section className="production-print-area">{selected && <BMRPrint batch={selected}/>}</section>
  </div>;
}
function Field({label,value,onChange,type="text",required=false,...props}) { return <label className="field-label">{label}<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} required={required} {...props}/></label>; }

// ── Shared BMR document header ─────────────────────────────────────────────
function BmrHeader({ subtitle, fields }) {
  return (
    <div className="bmr-cover-doc">
      <div className="bmr-cover-header">
        <div className="bmr-cover-company">
          <img src="/aroma-logo.png" alt="Aroma logo" className="bmr-cover-logo" />
          <div>
            <b>Aroma Herbs &amp; Ayurvedic Industries Pvt. Ltd.</b>
            <span>D-19, MIDC, Industrial Area, Hingna, Nagpur- 44016</span>
          </div>
        </div>
        <div className="bmr-cover-title-box">
          BATCH MANUFACTURING RECORD
          {subtitle && <div style={{ fontSize: 12, fontWeight: 700, borderTop: "1px solid #555", marginTop: 4, paddingTop: 4, letterSpacing: ".04em" }}>{subtitle}</div>}
        </div>
      </div>
      {fields}
    </div>
  );
}

// Fields table shared by pages 2-8
function BmrFieldsTable({ data, onChange }) {
  const ci = (k) => (v) => onChange(k, v);
  return (
    <table className="bmr-cover-table">
      <tbody>
        <tr><th>Product Name</th><td colSpan="3"><input className="bmr-cover-input" value={data.productName||""} onChange={e=>onChange("productName",e.target.value)} /></td></tr>
        <tr><th>Batch No.</th><td><input className="bmr-cover-input" value={data.batchNo||""} onChange={e=>onChange("batchNo",e.target.value)} /></td><th>Batch Size</th><td><input className="bmr-cover-input" value={data.batchSize||""} onChange={e=>onChange("batchSize",e.target.value)} /></td></tr>
        <tr><th>Mfg. Date</th><td><input className="bmr-cover-input" type="date" value={data.mfgDate||""} onChange={e=>onChange("mfgDate",e.target.value)} /></td><th>Exp. Date</th><td><input className="bmr-cover-input" type="date" value={data.expDate||""} onChange={e=>onChange("expDate",e.target.value)} /></td></tr>
        <tr><th>Date</th><td><input className="bmr-cover-input" type="date" value={data.date||""} onChange={e=>onChange("date",e.target.value)} /></td><th>Page No.</th><td><input className="bmr-cover-input" value={data.pageNo||""} onChange={e=>onChange("pageNo",e.target.value)} /></td></tr>
      </tbody>
    </table>
  );
}

// Shared signature row
function BmrSignatures({ data, onChange }) {
  return (
    <table className="bmr-cover-sign-table">
      <thead><tr><th>Prepared By</th><th>Reviewed By</th><th>Approved By</th></tr></thead>
      <tbody>
        <tr>
          <td><input className="bmr-cover-input" value={data.prodChemist||""} onChange={e=>onChange("prodChemist",e.target.value)} placeholder="Name" /></td>
          <td><input className="bmr-cover-input" value={data.prodManager||""} onChange={e=>onChange("prodManager",e.target.value)} placeholder="Name" /></td>
          <td><input className="bmr-cover-input" value={data.authSign||""} onChange={e=>onChange("authSign",e.target.value)} placeholder="Name" /></td>
        </tr>
        <tr className="bmr-sign-spacer"><td /><td /><td /></tr>
      </tbody>
    </table>
  );
}

// ── Process Library: CRUD for saved manufacturing procedures ────────────────
const STEPS = ["step1","step2","step3","step4","step5","step6"];

function ProcessLibrary({ p4, setP4 }) {
  const [action, setAction]             = useState("");
  const [processes, setProcesses]       = useState([]);
  const [selectedId, setSelectedId]     = useState("");
  const [nameInput, setNameInput]       = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [feedback, setFeedback]         = useState("");

  // Load from backend on mount
  useEffect(() => {
    api.get("/batch-data").then(res => {
      const libs = (res || []).filter(r => String(r.batchId || "").startsWith("PROC-")).map(r => r.data);
      setProcesses(libs);
    }).catch(() => {});
  }, []);

  const selectedProc = processes.find(p => p.id === selectedId);

  const persist = (list) => {
    setProcesses(list);
  };

  const handleActionChange = (value) => {
    setAction(value);
    setSelectedId("");
    setNameInput("");
    setDescriptionInput("");
    setFeedback("");
  };

  // CREATE — save current step fields as a new named process
  const handleCreate = () => {
    const name = nameInput.trim();
    if (!name) { setFeedback("Enter a name for the new process."); return; }
    if (processes.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      setFeedback("A process with this name already exists. Use a different name."); return;
    }
    const steps = {};
    STEPS.forEach(k => { steps[k] = p4[k] || ""; });
    const newProc = { id: `proc-${Date.now()}`, name, description: descriptionInput.trim(), steps };
    persist([...processes, newProc]);
    api.post("/batch-data", { batchId: `PROC-${newProc.id}`, data: newProc }).catch(() => {});
    setNameInput("");
    setDescriptionInput("");
    setFeedback(`✅ Process "${name}" saved to library.`);
  };

  // USE — load a saved process into the current p4 steps
  const handleUse = () => {
    if (!selectedProc) { setFeedback("Select a process to load."); return; }
    setP4(x => ({ ...x, ...selectedProc.steps }));
    setFeedback(`✅ Process "${selectedProc.name}" loaded into the steps below.`);
    setAction("");
  };

  // EDIT — rename an existing process and optionally update its steps with current values
  const handleEdit = () => {
    if (!selectedProc) { setFeedback("Select a process to edit."); return; }
    const name = nameInput.trim() || selectedProc.name;
    const description = descriptionInput.trim() !== "" ? descriptionInput.trim() : (selectedProc.description || "");
    const duplicate = processes.find(p => p.id !== selectedId && p.name.toLowerCase() === name.toLowerCase());
    if (duplicate) { setFeedback("Another process already uses that name."); return; }
    const updatedSteps = {};
    STEPS.forEach(k => { updatedSteps[k] = p4[k] || ""; });
    const updatedProc = { ...selectedProc, name, description, steps: updatedSteps };
    const updated = processes.map(p => p.id === selectedId ? updatedProc : p);
    persist(updated);
    api.post("/batch-data", { batchId: `PROC-${selectedProc.id}`, data: updatedProc }).catch(() => {});
    setFeedback(`✅ Process "${name}" updated (steps synced from current page).`);
  };

  // DELETE — remove a saved process
  const handleDelete = () => {
    if (!selectedProc) { setFeedback("Select a process to delete."); return; }
    if (!window.confirm(`Delete process "${selectedProc.name}"? This cannot be undone.`)) return;
    persist(processes.filter(p => p.id !== selectedId));
    api.delete(`/batch-data/PROC-${selectedProc.id}`).catch(() => {});
    setSelectedId("");
    setFeedback(`Process deleted.`);
  };

  return (
    <div style={{ margin: "16px 0", padding: "14px 16px", border: "1px solid #d4e8d9", borderRadius: 8, background: "#f8fdf9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, color: "#27603b", whiteSpace: "nowrap" }}>Process Library</b>
        <select
          value={action}
          onChange={e => handleActionChange(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc", minWidth: 220 }}
        >
          <option value="">— Select action —</option>
          <option value="create">➕ Add new process (save current steps)</option>
          <option value="use">📂 Use existing process (load into steps)</option>
          <option value="edit">✏️ Edit existing process (update with current steps)</option>
          <option value="delete">🗑️ Delete existing process</option>
        </select>
      </div>

      {/* CREATE */}
      {action === "create" && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Name of Procedure (e.g. Cream Base v2)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc", minWidth: 260, flex: 1 }}
            />
          </div>
          <textarea
            placeholder="Description — briefly describe what this procedure does, its purpose or product type"
            value={descriptionInput}
            onChange={e => setDescriptionInput(e.target.value)}
            rows={2}
            style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc", resize: "vertical", fontFamily: "inherit" }}
          />
          <div>
            <button type="button" className="primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleCreate}>
              Save current steps as new process
            </button>
          </div>
        </div>
      )}

      {/* USE / EDIT / DELETE — need a process selector */}
      {(action === "use" || action === "edit" || action === "delete") && (
        <div style={{ marginTop: 12 }}>
          {processes.length === 0 ? (
            <p style={{ fontSize: 13, color: "#a3332b", margin: 0 }}>No saved processes yet. Use "Add new process" to save one first.</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setNameInput(""); setFeedback(""); }}
                style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc", minWidth: 240 }}
              >
                <option value="">— Select a saved process —</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.description ? ` — ${p.description.slice(0, 50)}${p.description.length > 50 ? "…" : ""}` : ""}
                  </option>
                ))}
              </select>

              {action === "use" && selectedId && (
                <>
                  {selectedProc?.description && (
                    <p style={{ margin: "8px 0 4px", fontSize: 12, color: "#59675f", fontStyle: "italic" }}>
                      {selectedProc.description}
                    </p>
                  )}
                  <button type="button" className="primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleUse}>
                    Load into steps
                  </button>
                </>
              )}

              {action === "edit" && selectedId && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder={selectedProc?.name || "New name (leave blank to keep)"}
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc" }}
                    />
                    <textarea
                      placeholder={selectedProc?.description || "Description (leave blank to keep existing)"}
                      value={descriptionInput}
                      onChange={e => setDescriptionInput(e.target.value)}
                      rows={2}
                      style={{ padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd6cc", resize: "vertical", fontFamily: "inherit" }}
                    />
                    <div>
                      <button type="button" className="secondary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleEdit}>
                        Update process
                      </button>
                    </div>
                  </div>
                </>
              )}

              {action === "delete" && selectedId && (
                <button type="button" style={{ fontSize: 12, padding: "6px 14px", background: "#fae7e5", color: "#a3332b", border: "1px solid #e9b9b5", borderRadius: 6, cursor: "pointer" }} onClick={handleDelete}>
                  Delete process
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p style={{ marginTop: 8, fontSize: 12, color: feedback.startsWith("✅") ? "#27603b" : "#a3332b", margin: "8px 0 0" }}>
          {feedback}
        </p>
      )}
    </div>
  );
}

// ── BmrSubPages: renders pages 2-9 (CoA) ────────────────────────────────────
function BmrSubPages({ bmrPage, setBmrPage, selected, p2, setP2, p3, setP3, p4, setP4, p5, setP5, p6, setP6, p7, setP7, p8, setP8, coa, setCoa, saveP2, saveP3, saveP4, saveP5, saveP6, saveP7, saveP8, saveCoa, message, mkDispRow, mkMatRow, mkFillRow, mkLblRow, mkPkgRow, materials, stockBalances, user }) {
  const u2 = (k, v) => setP2(x => ({...x, [k]: v}));
  const u3 = (k, v) => setP3(x => ({...x, [k]: v}));
  const u4 = (k, v) => setP4(x => ({...x, [k]: v}));
  const u5 = (k, v) => setP5(x => ({...x, [k]: v}));
  const u6 = (k, v) => setP6(x => ({...x, [k]: v}));
  const u7 = (k, v) => setP7(x => ({...x, [k]: v}));
  const u8 = (k, v) => setP8(x => ({...x, [k]: v}));
  const uc = (k, v) => setCoa(x => ({...x, [k]: v}));

  // ── Issue-from-inventory state (used on Page 3) ──
  const [issuing, setIssuing]   = useState(false);
  const [issueMsg, setIssueMsg] = useState("");

  const navBar = (cur, back, fwd, backLabel, fwdLabel) => (
    <div className="bmr-cover-actions">
      {back && <button type="button" className="secondary" onClick={() => setBmrPage(back)}>← Back to Page {back}</button>}
      <span style={{ flex: 1 }} />
      {message && <span className="order-message" style={{ fontSize: 13 }}>{message}</span>}
      <button className="primary" type="submit"><ArrowRight size={16} /> {fwdLabel || "Save & Continue"}</button>
    </div>
  );

  // ── Page 2: Batch Dispensing Sheet Production / Store ──
  if (bmrPage === 2) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="2" title="Batch Dispensing Sheet — Production / Store" text="Record all materials dispensed for this batch. Page 2 of 8." />
      <form onSubmit={saveP2}>
        <BmrHeader subtitle="BATCH DISPENSING SHEET PRODUCTION / STORE" fields={<BmrFieldsTable data={p2} onChange={u2} />} />
        <div className="bmr-cover-section">
          <p className="bmr-cover-gmp-intro">Following instruction shall be followed during manufacturing of batch</p>
          <ol className="bmr-cover-list">
            <li>All precaution must be taken to avoid contamination.</li>
            <li>Ensure that equipments are clean before dispensing the material.</li>
          </ol>
        </div>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="bmr-data-table">
            <thead><tr><th style={{width:40}}>Sr. No.</th><th>Name of Material</th><th>A.R. No.</th><th>Qty. Issued (in kg)</th><th>Issued By</th><th>Received By</th><th style={{width:36}}></th></tr></thead>
            <tbody>
              {p2.rows.map((row, i) => (
                <tr key={row.id}>
                  <td style={{textAlign:"center"}}>{i+1}</td>
                  <td>
                    <select
                      className="bmr-table-input"
                      value={row.name}
                      onChange={e => {
                        const chosen = materials.find(m => m.material === e.target.value);
                        setP2(x => ({...x, rows: x.rows.map((r,j) => j===i
                          ? {...r, name: e.target.value, qtyIssued: chosen ? String(chosen.quantity) : r.qtyIssued}
                          : r
                        )}));
                      }}
                    >
                      <option value="">— Select material —</option>
                      {materials.map(m => (
                        <option key={m.id || m.material} value={m.material}>
                          {m.material}{m.unit ? ` (${m.unit})` : ""}
                        </option>
                      ))}
                      {/* Allow free-text by keeping current value if it's not in the list */}
                      {row.name && !materials.find(m => m.material === row.name) && (
                        <option value={row.name}>{row.name}</option>
                      )}
                    </select>
                  </td>
                  <td><input className="bmr-table-input" value={row.arNo} onChange={e => setP2(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, arNo: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.qtyIssued} onChange={e => setP2(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, qtyIssued: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.issuedBy} onChange={e => setP2(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, issuedBy: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.receivedBy} onChange={e => setP2(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, receivedBy: e.target.value} : r)}))} /></td>
                  <td><button type="button" className="text-button" style={{fontSize:11}} onClick={() => setP2(x => ({...x, rows: x.rows.filter((_,j) => j!==i)}))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" style={{marginTop:8,fontSize:12}} onClick={() => setP2(x => ({...x, rows: [...x.rows, mkDispRow()]}))}>+ Add row</button>
        </div>
        <BmrSignatures data={p2} onChange={u2} />
        {navBar(2, null, 3)}
      </form>
    </section>
  );

  // ── Page 3: Material Issue ──
  if (bmrPage === 3) {
    // Match each p3 row to a stockBalance item by name (case-insensitive)
    const getBalance = (name) => stockBalances.find(
      b => b.name?.toLowerCase() === name?.toLowerCase()
    );

    const issueFromInventory = async () => {
      const toIssue = p3.rows.filter(r => r.materialId && Number(r.qtyIssued) > 0);
      if (!toIssue.length) { setIssueMsg("⚠️ Select materials and enter quantities to issue first."); return; }

      // Check each row against available stock before calling API
      for (const r of toIssue) {
        const bal = getBalance(r.name);
        if (bal && Number(r.qtyIssued) > bal.usableStock + 1e-9) {
          setIssueMsg(`❌ ${r.name}: requested ${r.qtyIssued} ${bal.unit} but only ${bal.usableStock} available.`);
          return;
        }
      }

      setIssuing(true);
      setIssueMsg("");
      try {
        await api.post("/inventory/stock-transactions/manual-issue", {
          items: toIssue.map(r => ({
            materialId: r.materialId,
            quantity:   Number(r.qtyIssued),
            batchNumber: r.batchNo || "",
            remarks:    `BMR ${selected.batchNo || selected.id} — ${r.name}`,
          })),
          remarks: `Issued to production batch ${selected.batchNo || selected.id} by ${user?.name || "Production Incharge"}`,
        });
        setIssueMsg(`✅ ${toIssue.length} material(s) issued from inventory successfully.`);
      } catch (err) {
        setIssueMsg(`❌ ${err.message}`);
      } finally {
        setIssuing(false);
      }
    };

    return (
    <section className="panel production-plan-panel">
      <SectionTitle number="3" title="Material Issue Record" text="Record quantities issued and used per material, then click Issue from Inventory to deduct stock. Page 3 of 8." />
      <form onSubmit={saveP3}>
        <BmrHeader subtitle={null} fields={<BmrFieldsTable data={p3} onChange={u3} />} />

        {/* Issue from Inventory panel */}
        <div style={{ margin: "14px 0 10px", padding: "12px 16px", background: "#f3f8f2", border: "1px solid #c8dfc8", borderRadius: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b style={{ fontSize: 13, color: "#27603b" }}>Issue Materials from Inventory</b>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#5a625c" }}>
              Rows with a selected material and non-zero "Qty. Issued" will be deducted from the live stock ledger.
            </p>
          </div>
          <button
            type="button"
            className="primary"
            onClick={issueFromInventory}
            disabled={issuing}
            style={{ minWidth: 200, fontSize: 13 }}
          >
            {issuing ? "Issuing…" : "⬇ Issue from Inventory"}
          </button>
          {issueMsg && (
            <p style={{ width: "100%", margin: 0, fontSize: 13, color: issueMsg.startsWith("✅") ? "#27603b" : "#a3332b", fontWeight: 600 }}>
              {issueMsg}
            </p>
          )}
        </div>

        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="bmr-data-table">
            <thead>
              <tr>
                <th style={{width:40}}>Sr. No.</th>
                <th>Material Name</th>
                <th>Available Stock</th>
                <th>Qty. for 100%</th>
                <th>Qty. Issued (in Kg)</th>
                <th>Qty. Used (in Kg)</th>
                <th>Check By</th>
                <th style={{width:36}}></th>
              </tr>
            </thead>
            <tbody>
              {p3.rows.map((row, i) => {
                const bal = getBalance(row.name);
                const over = bal && Number(row.qtyIssued) > bal.usableStock + 1e-9;
                return (
                  <tr key={row.id} style={over ? { background: "#fbe8e5" } : {}}>
                    <td style={{textAlign:"center"}}>{i+1}</td>
                    <td>
                      <select
                        className="bmr-table-input"
                        value={row.name}
                        onChange={e => {
                          const chosenMat = materials.find(m => m.material === e.target.value);
                          const chosenBal = stockBalances.find(b => b.name?.toLowerCase() === e.target.value?.toLowerCase());
                          setP3(x => ({...x, rows: x.rows.map((r,j) => j===i ? {
                            ...r,
                            name:       e.target.value,
                            materialId: chosenBal?.materialId ? String(chosenBal.materialId) : (chosenMat?.materialId || ""),
                            qtyIssued:  chosenMat ? String(chosenMat.quantity) : r.qtyIssued,
                          } : r)}));
                        }}
                      >
                        <option value="">— Select material —</option>
                        {/* Show all backend stock items first (have real materialId) */}
                        {stockBalances.filter(b => b.usableStock > 0).map(b => (
                          <option key={b.materialId} value={b.name}>
                            {b.name} ({b.usableStock} {b.unit} available)
                          </option>
                        ))}
                        {/* Also show materials from Page 1 formula that may not be in stock yet */}
                        {materials.filter(m => !stockBalances.find(b => b.name?.toLowerCase() === m.material?.toLowerCase())).map(m => (
                          <option key={m.id || m.material} value={m.material}>
                            {m.material}{m.unit ? ` (${m.unit})` : ""} — not in stock
                          </option>
                        ))}
                        {/* Keep saved value if no longer in either list */}
                        {row.name && !stockBalances.find(b => b.name?.toLowerCase() === row.name?.toLowerCase()) && !materials.find(m => m.material === row.name) && (
                          <option value={row.name}>{row.name}</option>
                        )}
                      </select>
                    </td>
                    <td style={{ fontWeight: 700, color: over ? "#a3332b" : bal ? "#27603b" : "#999", fontSize: 12, whiteSpace: "nowrap" }}>
                      {bal ? `${bal.usableStock} ${bal.unit}` : "—"}
                    </td>
                    <td><input className="bmr-table-input" value={row.qty100} onChange={e => setP3(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, qty100: e.target.value} : r)}))} /></td>
                    <td>
                      <input
                        className="bmr-table-input"
                        value={row.qtyIssued}
                        style={over ? { borderColor: "#a3332b", color: "#a3332b" } : {}}
                        onChange={e => setP3(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, qtyIssued: e.target.value} : r)}))}
                      />
                      {over && <small style={{ color: "#a3332b", display: "block", fontSize: 10 }}>Exceeds available</small>}
                    </td>
                    <td><input className="bmr-table-input" value={row.qtyUsed} onChange={e => setP3(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, qtyUsed: e.target.value} : r)}))} /></td>
                    <td><input className="bmr-table-input" value={row.checkBy} onChange={e => setP3(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, checkBy: e.target.value} : r)}))} /></td>
                    <td><button type="button" className="text-button" style={{fontSize:11}} onClick={() => setP3(x => ({...x, rows: x.rows.filter((_,j) => j!==i)}))}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="secondary" style={{marginTop:8,fontSize:12}} onClick={() => setP3(x => ({...x, rows: [...x.rows, mkMatRow()]}))}>+ Add row</button>
        </div>
        <div className="bmr-cover-section">
          <div className="bmr-cover-section-title" style={{textDecoration:"none",textAlign:"left",fontWeight:800}}>Line Clearance:</div>
          <ol className="bmr-cover-list">
            <li>Area is cleaned as per standard procedure.</li>
            <li>Equipment is cleaned as per standard procedure.</li>
            <li>Accessories to be used are cleaned.</li>
            <li>Last rinse from equipment is clear.</li>
          </ol>
        </div>
        <BmrSignatures data={p3} onChange={u3} />
        {navBar(3, 2, 4)}
      </form>
    </section>
    );
  }

  // ── Page 4: Manufacturing Procedure ──
  if (bmrPage === 4) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="4" title="Manufacturing Procedure" text="Record the step-by-step manufacturing procedure. Page 4 of 8." />
      <form onSubmit={saveP4}>
        <BmrHeader subtitle="MANUFACTURING PROCEDURE" fields={<BmrFieldsTable data={p4} onChange={u4} />} />
        <ProcessLibrary p4={p4} setP4={setP4} />
        <div className="bmr-cover-section">
          <ol className="bmr-cover-list" style={{gap:10}}>
            {["step1","step2","step3","step4","step5","step6"].map((k,i) => (
              <li key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
                <textarea className="bmr-procedure-textarea" rows={k==="step2"?4:2} value={p4[k]} onChange={e=>u4(k,e.target.value)} />
              </li>
            ))}
          </ol>
          <div className="bmr-cover-gmp-intro" style={{marginTop:14,fontWeight:700}}>
            Note: Wear hand gloves, mask, cap and gowning while carrying the complete manufacturing procedure.
          </div>
        </div>
        <BmrSignatures data={p4} onChange={u4} />
        {navBar(4, 3, 5)}
      </form>
    </section>
  );

  // ── Page 5: Filling Record ──
  if (bmrPage === 5) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="5" title="Filling Record" text="Record batch filling operations. Page 5 of 8." />
      <form onSubmit={saveP5}>
        <BmrHeader subtitle="FILLING RECORD" fields={<BmrFieldsTable data={p5} onChange={u5} />} />
        <div className="bmr-cover-section">
          <p className="bmr-cover-gmp-intro" style={{fontWeight:700}}>Note:</p>
          <ol className="bmr-cover-list">
            <li>Ensure Tube Filling Machine is cleaned.</li>
            <li>Ensure all utensils are cleaned.</li>
            <li>Ensure Tubes are cleaned.</li>
            <li>Adjust require filled volume quantity by adjusting the piston.</li>
          </ol>
        </div>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="bmr-data-table">
            <thead><tr><th style={{width:40}}>Sr. No.</th><th>Date</th><th>Machine Name / ID</th><th>Operator Name</th><th>Worker Name</th><th>Qty. Filled</th><th style={{width:36}}></th></tr></thead>
            <tbody>
              {p5.rows.map((row, i) => (
                <tr key={row.id}>
                  <td style={{textAlign:"center"}}>{i+1}</td>
                  <td><input className="bmr-table-input" type="date" value={row.date} onChange={e => setP5(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, date: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.machine} onChange={e => setP5(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, machine: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.operator} onChange={e => setP5(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, operator: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.worker} onChange={e => setP5(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, worker: e.target.value} : r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.qtyFilled} onChange={e => setP5(x => ({...x, rows: x.rows.map((r,j) => j===i ? {...r, qtyFilled: e.target.value} : r)}))} /></td>
                  <td><button type="button" className="text-button" style={{fontSize:11}} onClick={() => setP5(x => ({...x, rows: x.rows.filter((_,j) => j!==i)}))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" style={{marginTop:8,fontSize:12}} onClick={() => setP5(x => ({...x, rows: [...x.rows, mkFillRow()]}))}>+ Add row</button>
        </div>
        <div className="bmr-cover-section" style={{display:"flex",flexDirection:"column",gap:8}}>
          <label className="field-label" style={{maxWidth:360}}>Batch Filling completed on date:<input type="date" className="bmr-cover-input" style={{marginTop:4}} value={p5.batchFillingDate} onChange={e=>u5("batchFillingDate",e.target.value)} /></label>
          <label className="field-label" style={{maxWidth:360}}>Total No. of Tubes filled:<input className="bmr-cover-input" style={{marginTop:4}} value={p5.totalTubesFilled} onChange={e=>u5("totalTubesFilled",e.target.value)} placeholder="e.g. 5000" /></label>
        </div>
        <div className="bmr-rejection-section">
          <div className="bmr-rejection-title">Rejection Quantity</div>
          <div className="bmr-rejection-grid">
            <label className="field-label">
              Tubes
              <input className="bmr-cover-input" value={p5.rejectionTubes||""} onChange={e=>u5("rejectionTubes",e.target.value)} placeholder="No. of tubes rejected" />
            </label>
            <label className="field-label">
              Material
              <input className="bmr-cover-input" value={p5.rejectionMaterial||""} onChange={e=>u5("rejectionMaterial",e.target.value)} placeholder="Material name / batch" />
            </label>
            <label className="field-label" style={{gridColumn:"1/-1"}}>
              Reason of Rejection
              <textarea className="bmr-procedure-textarea" rows={3} value={p5.rejectionReason||""} onChange={e=>u5("rejectionReason",e.target.value)} placeholder="Describe the reason for rejection" />
            </label>
          </div>
        </div>
        <BmrSignatures data={p5} onChange={u5} />
        {navBar(5, 4, 6)}
      </form>
    </section>
  );

  // ── Page 6: In Process Checks ──
  if (bmrPage === 6) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="6" title="In Process Checks" text="Record sampling and parameter test results. Page 6 of 8." />
      <form onSubmit={saveP6}>
        <BmrHeader subtitle="IN PROCESS CHECKS" fields={<BmrFieldsTable data={p6} onChange={u6} />} />
        <div style={{marginTop:14}}>
          <table className="bmr-data-table" style={{marginBottom:14}}>
            <thead><tr><th style={{width:60}}>Sr. No.</th><th>Quantity Sampled</th><th>Sampling Done By</th></tr></thead>
            <tbody>
              <tr>
                <td style={{textAlign:"center"}}>1.</td>
                <td><input className="bmr-table-input" value={p6.sampleQty} onChange={e=>u6("sampleQty",e.target.value)} placeholder="e.g. 50 g" /></td>
                <td><input className="bmr-table-input" value={p6.samplingBy} onChange={e=>u6("samplingBy",e.target.value)} placeholder="Name" /></td>
              </tr>
            </tbody>
          </table>
          <table className="bmr-data-table">
            <thead><tr><th style={{width:50}}>Sr. No.</th><th>Parameter</th><th>Specification</th><th>Observation</th><th>Result Pass/Fail</th></tr></thead>
            <tbody>
              {[["appearance","Appearance"],["color","Color"],["odour","Odour"],["ph","pH"],["viscosity","Viscosity"]].map(([key,label],i) => (
                <tr key={key}>
                  <td style={{textAlign:"center"}}>{i+1}.</td>
                  <td>{label}</td>
                  <td><input className="bmr-table-input" value={p6[key].spec} onChange={e=>u6(key,{...p6[key],spec:e.target.value})} /></td>
                  <td><input className="bmr-table-input" value={p6[key].obs} onChange={e=>u6(key,{...p6[key],obs:e.target.value})} /></td>
                  <td><input className="bmr-table-input" value={p6[key].result} onChange={e=>u6(key,{...p6[key],result:e.target.value})} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop:14}}>
            <label className="field-label">Remarks if any:<textarea className="bmr-procedure-textarea" rows={2} value={p6.remarks} onChange={e=>u6("remarks",e.target.value)} /></label>
          </div>
        </div>
        <BmrSignatures data={p6} onChange={u6} />
        {navBar(6, 5, 7)}
      </form>
    </section>
  );

  // ── Page 7: Labelling and Packing Record ──
  if (bmrPage === 7) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="7" title="Labelling and Packing Record" text="Record labelling and packing operations. Page 7 of 8." />
      <form onSubmit={saveP7}>
        <BmrHeader subtitle="LABELLING AND PACKING RECORD" fields={<BmrFieldsTable data={p7} onChange={u7} />} />
        <div style={{marginTop:14}}>
          <div className="bmr-cover-section-title" style={{textAlign:"left",textDecoration:"none",marginBottom:8,fontSize:13}}>LABELLING RECORD:</div>
          <table className="bmr-data-table" style={{marginBottom:8}}>
            <thead><tr><th style={{width:50}}>Sr. No.</th><th>Date</th><th>Name of Worker</th><th>Labelled Qty.</th><th style={{width:36}}></th></tr></thead>
            <tbody>
              {p7.lblRows.map((row, i) => (
                <tr key={row.id}>
                  <td style={{textAlign:"center"}}>{i+1}.</td>
                  <td><input className="bmr-table-input" type="date" value={row.date} onChange={e=>setP7(x=>({...x,lblRows:x.lblRows.map((r,j)=>j===i?{...r,date:e.target.value}:r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.worker} onChange={e=>setP7(x=>({...x,lblRows:x.lblRows.map((r,j)=>j===i?{...r,worker:e.target.value}:r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.labelledQty} onChange={e=>setP7(x=>({...x,lblRows:x.lblRows.map((r,j)=>j===i?{...r,labelledQty:e.target.value}:r)}))} /></td>
                  <td><button type="button" className="text-button" style={{fontSize:11}} onClick={()=>setP7(x=>({...x,lblRows:x.lblRows.filter((_,j)=>j!==i)}))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" style={{fontSize:12,marginBottom:10}} onClick={()=>setP7(x=>({...x,lblRows:[...x.lblRows,mkLblRow()]}))}>+ Add row</button>
          <label className="field-label" style={{maxWidth:300,marginBottom:16}}>Total quantity Labelled:<input className="bmr-cover-input" value={p7.totalLabelledQty} onChange={e=>u7("totalLabelledQty",e.target.value)} placeholder="e.g. 4800 pcs" /></label>

          <div className="bmr-cover-section-title" style={{textAlign:"left",textDecoration:"none",marginBottom:8,fontSize:13}}>PACKING RECORD:</div>
          <table className="bmr-data-table" style={{marginBottom:8}}>
            <thead><tr><th style={{width:50}}>Sr. No.</th><th>Date</th><th>Name of Worker</th><th>Packed Qty.</th><th style={{width:36}}></th></tr></thead>
            <tbody>
              {p7.pkgRows.map((row, i) => (
                <tr key={row.id}>
                  <td style={{textAlign:"center"}}>{i+1}.</td>
                  <td><input className="bmr-table-input" type="date" value={row.date} onChange={e=>setP7(x=>({...x,pkgRows:x.pkgRows.map((r,j)=>j===i?{...r,date:e.target.value}:r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.worker} onChange={e=>setP7(x=>({...x,pkgRows:x.pkgRows.map((r,j)=>j===i?{...r,worker:e.target.value}:r)}))} /></td>
                  <td><input className="bmr-table-input" value={row.packedQty} onChange={e=>setP7(x=>({...x,pkgRows:x.pkgRows.map((r,j)=>j===i?{...r,packedQty:e.target.value}:r)}))} /></td>
                  <td><button type="button" className="text-button" style={{fontSize:11}} onClick={()=>setP7(x=>({...x,pkgRows:x.pkgRows.filter((_,j)=>j!==i)}))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" style={{fontSize:12,marginBottom:10}} onClick={()=>setP7(x=>({...x,pkgRows:[...x.pkgRows,mkPkgRow()]}))}>+ Add row</button>
          <label className="field-label" style={{maxWidth:300,marginBottom:16}}>Total quantity Packed:<input className="bmr-cover-input" value={p7.totalPackedQty} onChange={e=>u7("totalPackedQty",e.target.value)} placeholder="e.g. 4800 pcs" /></label>

          <div className="bmr-p7-dotted-fields">
            {[["inProcessSample","In process sample for testing"],["sampleAnalysis","Sample for analysis to QC department / another laboratory"],["controlSample","Control sample to QC department"],["totalBoxes","Total number of boxes packed"],["totalQtyPacked","Total number of quantities packed"],["totalTransferred","Total quantity transfers to finished goods store"]].map(([k,label],i) => (
              <label key={k} className="field-label bmr-dotted-line">
                <span>{i+1}. {label}:</span>
                <input className="bmr-dotted-input" value={p7[k]} onChange={e=>u7(k,e.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <BmrSignatures data={p7} onChange={u7} />
        {navBar(7, 6, 8)}
      </form>
    </section>
  );

  // ── Page 8: Specimen Labels / Carton ──
  if (bmrPage === 8) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="8" title="Specimen Labels / Carton" text="Attach or paste specimen label / carton here. Page 8 of 8." />
      <form onSubmit={saveP8}>
        <BmrHeader subtitle="SPECIMEN LABELS / CARTON" fields={<BmrFieldsTable data={p8} onChange={u8} />} />
        <div className="bmr-specimen-area">
          <p className="muted" style={{fontSize:12,textAlign:"center"}}>Paste or attach specimen label / carton in this area.<br/>Use the notes field below to record any label reference.</p>
          <textarea className="bmr-procedure-textarea" rows={4} value={p8.specimenNote} onChange={e=>u8("specimenNote",e.target.value)} placeholder="Label reference, batch code, or attach physical label after printing." style={{marginTop:14}} />
        </div>
        <BmrSignatures data={p8} onChange={u8} />
        {navBar(8, 7, 9, null, "Save & Continue to Certificate of Analysis")}
      </form>
    </section>
  );

  // ── Certificate of Analysis ──
  if (bmrPage === 9) return (
    <section className="panel production-plan-panel">
      <SectionTitle number="9" title="Certificate of Analysis" text="Record all analytical test results before finalising the BMR." />
      <form onSubmit={saveCoa}>
        <div className="bmr-cover-doc">
          <div className="bmr-cover-header">
            <div className="bmr-cover-title-box" style={{borderTop:"none"}}>CERTIFICATE OF ANALYSIS</div>
          </div>
          <table className="bmr-cover-table">
            <tbody>
              <tr><th>Product Name</th><td colSpan="3"><input className="bmr-cover-input" value={coa.productName} onChange={e=>uc("productName",e.target.value)} /></td></tr>
              <tr><th>Batch No.</th><td><input className="bmr-cover-input" value={coa.batchNo} onChange={e=>uc("batchNo",e.target.value)} /></td><th>Product Code</th><td><input className="bmr-cover-input" value={coa.productCode} onChange={e=>uc("productCode",e.target.value)} /></td></tr>
              <tr><th>A.R. No.</th><td><input className="bmr-cover-input" value={coa.arNo} onChange={e=>uc("arNo",e.target.value)} /></td><th>Batch Size</th><td><input className="bmr-cover-input" value={coa.batchSize} onChange={e=>uc("batchSize",e.target.value)} /></td></tr>
              <tr><th>Mfg Date</th><td><input className="bmr-cover-input" type="date" value={coa.mfgDate} onChange={e=>uc("mfgDate",e.target.value)} /></td><th>Exp. Date</th><td><input className="bmr-cover-input" type="date" value={coa.expDate} onChange={e=>uc("expDate",e.target.value)} /></td></tr>
              <tr><th>Date of Analysis</th><td><input className="bmr-cover-input" type="date" value={coa.dateOfAnalysis} onChange={e=>uc("dateOfAnalysis",e.target.value)} /></td><th>Quality Release Dt.</th><td><input className="bmr-cover-input" type="date" value={coa.qualityReleaseDt} onChange={e=>uc("qualityReleaseDt",e.target.value)} /></td></tr>
            </tbody>
          </table>
          <div style={{padding:"14px 0 0"}}>
            <table className="bmr-data-table">
              <thead><tr><th style={{width:50}}>Sr. No.</th><th>Name of Test</th><th>Specification</th><th>Observation</th><th>Result Pass/Fail</th></tr></thead>
              <tbody>
                {coa.tests.map((test, i) => (
                  <tr key={i}>
                    <td style={{textAlign:"center"}}>{i+1}.</td>
                    <td style={{fontWeight:600}}>{test.name}</td>
                    <td><input className="bmr-table-input" value={test.spec} onChange={e=>setCoa(x=>({...x,tests:x.tests.map((t,j)=>j===i?{...t,spec:e.target.value}:t)}))} /></td>
                    <td><input className="bmr-table-input" value={test.obs} onChange={e=>setCoa(x=>({...x,tests:x.tests.map((t,j)=>j===i?{...t,obs:e.target.value}:t)}))} /></td>
                    <td><input className="bmr-table-input" value={test.result} onChange={e=>setCoa(x=>({...x,tests:x.tests.map((t,j)=>j===i?{...t,result:e.target.value}:t)}))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{fontSize:11,color:"var(--muted)",marginTop:8}}>NMT – Not More Than, NLT – Not Less Than</p>
          </div>
          <div className="bmr-coa-signatures">
            <div>
              <label className="field-label">Analyzed By (Quality Control Analyst)<input className="bmr-cover-input" value={coa.analyzedBy} onChange={e=>uc("analyzedBy",e.target.value)} placeholder="Name" /></label>
            </div>
            <div>
              <label className="field-label">Approved By (Production Manager)<input className="bmr-cover-input" value={coa.approvedBy} onChange={e=>uc("approvedBy",e.target.value)} placeholder="Name" /></label>
            </div>
          </div>
        </div>
        {navBar(9, 8, 10, null, "Save CoA & Finish All BMR Pages →")}
      </form>
    </section>
  );

  return null;
}
function Summary({label,value}) { return <div className="production-summary-card"><small>{label}</small><b>{value}</b></div>; }
function Status({value}) { const tone=value==="Completed"?"ok":["Action Required","Stopped · Reported"].includes(value)?"bad":value==="In Process"?"live":"pending"; return <span className={`production-status ${tone}`}>{value}</span>; }
function SectionTitle({number,title,text}) { return <div className="production-section-title"><span className="step-number">{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>; }
function BMRPrint({batch}) {
  const p2 = batch.p2Data || {};
  const p3 = batch.p3Data || {};
  const p4 = batch.p4Data || {};
  const p5 = batch.p5Data || {};
  const p6 = batch.p6Data || {};
  const p7 = batch.p7Data || {};
  const p8 = batch.p8Data || {};
  const coa = batch.coaData || {};
  const fmtD = (v) => v ? String(v).split("-").reverse().join("/") : "…………";

  const PHeader = ({ subtitle }) => (
    <div className="bp-header">
      <div className="bp-header-top">
        <div className="bp-company">
          <b>Aroma Herbs &amp; Ayurvedic Industries Pvt. Ltd</b>
          <span>D-19, MIDC, Industrial Area, Hingna, Nagpur- 44016</span>
        </div>
        <div className="bp-logo-box">Aroma</div>
      </div>
      <div className="bp-title">BATCH MANUFACTURING RECORD</div>
      {subtitle && <div className="bp-subtitle">{subtitle}</div>}
    </div>
  );

  const PFields4 = ({ rows }) => (
    <table className="bp-fields-table">
      <tbody>{rows.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => cell.isHeader
            ? <th key={j}>{cell.label}</th>
            : <td key={j}>{cell.value || ""}</td>
          )}
        </tr>
      ))}</tbody>
    </table>
  );

  const PSigns = ({ d }) => (
    <table className="bp-signs-table">
      <thead><tr><th>Prepared By</th><th>Reviewd By</th><th>Approved By</th></tr></thead>
      <tbody><tr><td>{d?.prodChemist || ""}</td><td>{d?.prodManager || ""}</td><td>{d?.authSign || ""}</td></tr><tr className="bp-sign-space"><td/><td/><td/></tr></tbody>
    </table>
  );

  // Common field rows for pages 2-8
  const pageFieldRows = (d) => [
    [{isHeader:true,label:"Product Name"},{value:d.productName||batch.product}],
    [{isHeader:true,label:"Batch No."},{value:d.batchNo||batch.batchNo},{isHeader:true,label:"Batch Size"},{value:d.batchSize||batch.target}],
    [{isHeader:true,label:"Mfg. Date"},{value:fmtD(d.mfgDate||batch.mfgDate)},{isHeader:true,label:"Exp. Date"},{value:fmtD(d.expDate||batch.expDate)}],
    [{isHeader:true,label:"Date"},{value:fmtD(d.date||batch.date)},{isHeader:true,label:"Page No."},{value:d.pageNo||""}],
  ];

  return (
    <article className="production-print-sheet bp-document">

      {/* ── PAGE 1: Cover ── */}
      <div className="bp-page">
        <PHeader subtitle={null} />
        <table className="bp-fields-table">
          <tbody>
            <tr><th>Name of Product</th><td colSpan="3">{batch.product}</td></tr>
            <tr><th>Batch No.</th><td>{batch.batchNo||""}</td><th>Batch Size</th><td>{batch.target}</td></tr>
            <tr><th>Batch Started Date</th><td>{fmtD(batch.date)}</td><th>Batch Completed Date</th><td>{fmtD(batch.completedDate)}</td></tr>
            <tr><th>A.R. No.</th><td>{batch.arNo||""}</td><th>Product Code</th><td>{batch.productCode||""}</td></tr>
            <tr><th>Mfg. Date</th><td>{fmtD(batch.mfgDate)}</td><th>Exp. Date</th><td>{fmtD(batch.expDate)}</td></tr>
            <tr><th>Section</th><td>{batch.section||""}</td><th>Page No.</th><td>{batch.pageNo||"1 of 8"}</td></tr>
          </tbody>
        </table>
        <div className="bp-section-title">INSTRUCTION CONTROL AND SAFETY PRECAUTION</div>
        <ol className="bp-list">
          <li>Wear safety goggle, rubber hand gloves, organic vapour mask, apron while handling of raw material.</li>
          <li>Use earthen and bonding while transferring the solvent. Points exhaust shall be used while charging solid material.</li>
          <li>Ensure that the Equipment's used during the course of manufacture are earthen properly.</li>
          <li>Before charging the raw materials into the tank check the labels on the containers and ensure they are approved and well within the rest period.</li>
          <li>During the course of batch processing, comply with the limits as mentioned in the Batch Production and control record. Send In-process sample to QC along with in-process analysis request.</li>
          <li>All critical parameters are highlighted by bold letters.</li>
        </ol>
        <div className="bp-section-title">GMP INSTRUCTIONS</div>
        <p className="bp-intro">Following GMP instruction shall be followed during manufacturing of batch.</p>
        <ol className="bp-list">
          <li>All precaution must be taken to avoid contamination.</li>
          <li>Ensure that the instructions in BPCR are followed and all operations are carried out by trained operators.</li>
          <li>Ensure all the documents and records are complete as per written instruction.</li>
          <li>Cleaning and verification of minor equipment and utensil shall be recorded.</li>
          <li>Equipment cleaning and equipment status shall be updated as soon as status of equipment changes.</li>
        </ol>
        <PSigns d={{ prodChemist: batch.productionChemist, prodManager: batch.machine, authSign: batch.authorisedSignatory }} />
      </div>

      {/* ── PAGE 2: Batch Dispensing Sheet ── */}
      <div className="bp-page">
        <PHeader subtitle="BATCH DISPENSING SHEET PRODUCTION / STORE" />
        <PFields4 rows={pageFieldRows(p2)} />
        <p className="bp-intro" style={{marginTop:8}}>Following instruction shall be followed during manufacturing of batch</p>
        <ol className="bp-list">
          <li>All precaution must be taken to avoid contamination.</li>
          <li>Ensure that equipments are clean before dispensing the material.</li>
        </ol>
        <table className="bp-data-table" style={{marginTop:10}}>
          <thead><tr><th style={{width:"6%"}}>Sr. No.</th><th style={{width:"28%"}}>Name of Material</th><th style={{width:"18%"}}>A.R. No.</th><th style={{width:"18%"}}>Qty. Issued (in kg)</th><th style={{width:"15%"}}>Issued By</th><th style={{width:"15%"}}>Received By</th></tr></thead>
          <tbody>
            {(p2.rows||[]).map((row,i)=><tr key={i}><td style={{textAlign:"center"}}>{i+1}</td><td>{row.name}</td><td>{row.arNo}</td><td>{row.qtyIssued}</td><td>{row.issuedBy}</td><td>{row.receivedBy}</td></tr>)}
            {Array.from({length:Math.max(0,10-(p2.rows||[]).length)}).map((_,i)=><tr key={`e${i}`}><td style={{textAlign:"center"}}>{(p2.rows||[]).length+i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>)}
          </tbody>
        </table>
        <PSigns d={p2} />
      </div>

      {/* ── PAGE 3: Material Issue ── */}
      <div className="bp-page">
        <PHeader subtitle={null} />
        <PFields4 rows={pageFieldRows(p3)} />
        <table className="bp-data-table" style={{marginTop:10}}>
          <thead><tr><th style={{width:"6%"}}>Sr. No.</th><th style={{width:"28%"}}>Material Name</th><th style={{width:"16%"}}>Qty. for 100%</th><th style={{width:"18%"}}>Qty. Issued (in Kg)</th><th style={{width:"18%"}}>Qty. Used (in Kg)</th><th style={{width:"14%"}}>Check By</th></tr></thead>
          <tbody>
            {(p3.rows||[]).map((row,i)=><tr key={i}><td style={{textAlign:"center"}}>{i+1}</td><td>{row.name}</td><td>{row.qty100}</td><td>{row.qtyIssued}</td><td>{row.qtyUsed}</td><td>{row.checkBy}</td></tr>)}
            {Array.from({length:Math.max(0,10-(p3.rows||[]).length)}).map((_,i)=><tr key={`e${i}`}><td style={{textAlign:"center"}}>{(p3.rows||[]).length+i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>)}
          </tbody>
        </table>
        <div className="bp-section-label">Line Clearance:</div>
        <ol className="bp-list">
          <li>Area is cleaned as per standard procedure.</li>
          <li>Equipment is cleaned as per standard procedure.</li>
          <li>Accessories to be used are cleaned.</li>
          <li>Last rinse from equipment is clear.</li>
        </ol>
        <PSigns d={p3} />
      </div>

      {/* ── PAGE 4: Manufacturing Procedure ── */}
      <div className="bp-page">
        <PHeader subtitle="MANUFACTURING PROCEDURE" />
        <PFields4 rows={pageFieldRows(p4)} />
        <ol className="bp-list bp-procedure-list" style={{marginTop:10}}>
          {["step1","step2","step3","step4","step5","step6"].map((k,i)=><li key={k} style={{marginBottom:8}}>{p4[k]||""}</li>)}
        </ol>
        <p className="bp-note"><b>Note:</b> Wear hand gloves, mask, cap and gowning while carrying the complete manufacturing procedure.</p>
        <PSigns d={p4} />
      </div>

      {/* ── PAGE 5: Filling Record ── */}
      <div className="bp-page">
        <PHeader subtitle="FILLING RECORD" />
        <PFields4 rows={pageFieldRows(p5)} />
        <p className="bp-section-label" style={{marginTop:8}}><b>Note:</b></p>
        <ol className="bp-list">
          <li>Ensure Tube Filling Machine is cleaned.</li>
          <li>Ensure all utensils are cleaned.</li>
          <li>Ensure Tubes are cleaned.</li>
          <li>Adjust require filled volume quantity by adjusting the piston.</li>
        </ol>
        <table className="bp-data-table" style={{marginTop:10}}>
          <thead><tr><th style={{width:"6%"}}>Sr. No.</th><th style={{width:"16%"}}>Date</th><th style={{width:"22%"}}>Machine Name / ID</th><th style={{width:"20%"}}>Operator Name</th><th style={{width:"20%"}}>Worker Name</th><th style={{width:"16%"}}>Qty. Filled</th></tr></thead>
          <tbody>
            {(p5.rows||[]).map((row,i)=><tr key={i}><td style={{textAlign:"center"}}>{i+1}</td><td>{fmtD(row.date)}</td><td>{row.machine}</td><td>{row.operator}</td><td>{row.worker}</td><td>{row.qtyFilled}</td></tr>)}
            {Array.from({length:Math.max(0,5-(p5.rows||[]).length)}).map((_,i)=><tr key={`e${i}`}><td style={{textAlign:"center"}}>{(p5.rows||[]).length+i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>)}
          </tbody>
        </table>
        <div className="bp-fill-summary">
          <p>Batch Filling completed on date: <span className="bp-dotted-val">{fmtD(p5.batchFillingDate)}</span></p>
          <p>Total No. of Tubes filled: <span className="bp-dotted-val">{p5.totalTubesFilled||"……………"}</span></p>
        </div>
        {(p5.rejectionTubes||p5.rejectionMaterial||p5.rejectionReason) && (
          <div className="bp-rejection-box">
            <div className="bp-section-label">Rejection Quantity</div>
            <table className="bp-data-table">
              <thead><tr><th>Tubes</th><th>Material</th><th>Reason of Rejection</th></tr></thead>
              <tbody><tr><td>{p5.rejectionTubes||""}</td><td>{p5.rejectionMaterial||""}</td><td>{p5.rejectionReason||""}</td></tr></tbody>
            </table>
          </div>
        )}
        <PSigns d={p5} />
      </div>

      {/* ── PAGE 6: In Process Checks ── */}
      <div className="bp-page">
        <PHeader subtitle="IN PROCESS CHECKS" />
        <PFields4 rows={pageFieldRows(p6)} />
        <table className="bp-data-table" style={{marginTop:10,marginBottom:10}}>
          <thead><tr><th style={{width:"10%"}}>Sr. No.</th><th style={{width:"50%"}}>Quantity Sampled</th><th>Sampling Done By</th></tr></thead>
          <tbody><tr><td style={{textAlign:"center"}}>1.</td><td>{p6.sampleQty||""}</td><td>{p6.samplingBy||""}</td></tr></tbody>
        </table>
        <table className="bp-data-table">
          <thead><tr><th style={{width:"8%"}}>Sr. No.</th><th style={{width:"22%"}}>Parameter</th><th style={{width:"28%"}}>Specification</th><th style={{width:"28%"}}>Observation</th><th style={{width:"14%"}}>Result Pass/Fail</th></tr></thead>
          <tbody>
            {[["appearance","Appearance"],["color","Color"],["odour","Odour"],["ph","pH"],["viscosity","Viscosity"]].map(([key,label],i)=>(
              <tr key={key}><td style={{textAlign:"center"}}>{i+1}.</td><td>{label}</td><td>{p6[key]?.spec||""}</td><td>{p6[key]?.obs||""}</td><td>{p6[key]?.result||""}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="bp-section-label" style={{marginTop:10}}>Remarks if any: {p6.remarks||""}</p>
        <PSigns d={p6} />
      </div>

      {/* ── PAGE 7: Labelling and Packing Record ── */}
      <div className="bp-page">
        <PHeader subtitle="LABELLING AND PACKING RECORD" />
        <PFields4 rows={pageFieldRows(p7)} />
        <div className="bp-section-label" style={{marginTop:10}}>LABELLING RECORD:</div>
        <table className="bp-data-table">
          <thead><tr><th style={{width:"8%"}}>Sr. No.</th><th style={{width:"22%"}}>Date</th><th>Name of Worker</th><th style={{width:"22%"}}>Labelled Qty.</th></tr></thead>
          <tbody>
            {(p7.lblRows||[]).map((row,i)=><tr key={i}><td style={{textAlign:"center"}}>{i+1}.</td><td>{fmtD(row.date)}</td><td>{row.worker}</td><td>{row.labelledQty}</td></tr>)}
          </tbody>
        </table>
        <p className="bp-fill-line">Total quantity Labelled: <span className="bp-dotted-val">{p7.totalLabelledQty||"……………"}</span></p>
        <div className="bp-section-label" style={{marginTop:10}}>PACKING RECORD:</div>
        <table className="bp-data-table">
          <thead><tr><th style={{width:"8%"}}>Sr. No.</th><th style={{width:"22%"}}>Date</th><th>Name of Worker</th><th style={{width:"22%"}}>Packed Qty.</th></tr></thead>
          <tbody>
            {(p7.pkgRows||[]).map((row,i)=><tr key={i}><td style={{textAlign:"center"}}>{i+1}.</td><td>{fmtD(row.date)}</td><td>{row.worker}</td><td>{row.packedQty}</td></tr>)}
          </tbody>
        </table>
        <p className="bp-fill-line">Total quantity Packed: <span className="bp-dotted-val">{p7.totalPackedQty||"……………"}</span></p>
        <div className="bp-p7-lines">
          {[["inProcessSample","In process sample for testing"],["sampleAnalysis","Sample for analysis to QC department / another laboratory"],["controlSample","Control sample to QC department"],["totalBoxes","Total number of boxes packed"],["totalQtyPacked","Total number of quantities packed"],["totalTransferred","Total quantity transfers to finished goods store"]].map(([k,label],i)=>(
            <p key={k} className="bp-fill-line">{i+1}. {label}: <span className="bp-dotted-val">{p7[k]||"……………………………………………………"}</span></p>
          ))}
        </div>
        <PSigns d={p7} />
      </div>

      {/* ── PAGE 8: Specimen Labels / Carton ── */}
      <div className="bp-page">
        <PHeader subtitle="SPECIMEN LABELS / CARTON" />
        <PFields4 rows={pageFieldRows(p8)} />
        <div className="bp-specimen-box">
          <p style={{textAlign:"center",color:"#888",fontSize:10,marginBottom:8}}>Paste or attach specimen label / carton here</p>
          {p8.specimenNote && <p style={{fontSize:10,whiteSpace:"pre-wrap"}}>{p8.specimenNote}</p>}
        </div>
        <PSigns d={p8} />
      </div>

      {/* ── PAGE 9: Certificate of Analysis ── */}
      <div className="bp-page">
        <div className="bp-coa-title">CERTIFICATE OF ANALYSIS</div>
        <table className="bp-fields-table">
          <tbody>
            <tr><th>Product Name</th><td colSpan="3">{coa.productName||batch.product}</td></tr>
            <tr><th>Batch No.</th><td>{coa.batchNo||batch.batchNo||""}</td><th>Product Code</th><td>{coa.productCode||batch.productCode||""}</td></tr>
            <tr><th>A.R. No.</th><td>{coa.arNo||batch.arNo||""}</td><th>Batch Size</th><td>{coa.batchSize||batch.target}</td></tr>
            <tr><th>Mfg Date</th><td>{fmtD(coa.mfgDate||batch.mfgDate)}</td><th>Exp. Date</th><td>{fmtD(coa.expDate||batch.expDate)}</td></tr>
            <tr><th>Date of Analysis</th><td>{fmtD(coa.dateOfAnalysis)}</td><th>Quality Release Dt.</th><td>{fmtD(coa.qualityReleaseDt)}</td></tr>
          </tbody>
        </table>
        <table className="bp-data-table" style={{marginTop:12}}>
          <thead><tr><th style={{width:"8%"}}>Sr. No.</th><th style={{width:"28%"}}>Name of Test</th><th style={{width:"28%"}}>Specification</th><th style={{width:"22%"}}>Observation</th><th style={{width:"14%"}}>Result Pass/Fail</th></tr></thead>
          <tbody>
            {(coa.tests||[]).map((test,i)=>(
              <tr key={i}><td style={{textAlign:"center"}}>{i+1}.</td><td style={{fontWeight:600}}>{test.name}</td><td>{test.spec}</td><td>{test.obs}</td><td>{test.result}</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{fontSize:9,marginTop:6}}>NMT – Not More Than, NLT – Not Less Than</p>
        <div className="bp-coa-signs">
          <div><p className="bp-sign-line"/><p>Analyzed By<br/><span style={{fontSize:9}}>(Quality Control Analyst)</span></p></div>
          <div style={{textAlign:"right"}}><p className="bp-sign-line"/><p>Approved By<br/><span style={{fontSize:9}}>(Production Manager)</span></p></div>
        </div>
        <div style={{marginTop:8,textAlign:"right",fontSize:9,color:"#666"}}>BMR Generated: {fmtDate(batch.bmrGeneratedAt||batch.createdAt)}</div>
      </div>

    </article>
  );
}
function ProductionReports({batches,movements}) {
  const target=batches.reduce((s,x)=>s+(Number(x.target)||0),0), output=batches.reduce((s,x)=>s+(Number(x.actualProduced)||0),0), rejected=batches.reduce((s,x)=>s+(Number(x.actualRejected)||0),0), good=batches.reduce((s,x)=>s+(x.qualityChecks||[]).reduce((n,q)=>n+Number(q.good||0),0),0);
  const checks=batches.flatMap((batch)=>(batch.qualityChecks||[]).map((check,index)=>({batch,check,id:`${batch.id}-${index}`})));
  const usage=movements.filter((row)=>row.type==="Stock Out"&&row.productionBatchId);
  const machines=new Map(); const shifts=new Map();
  batches.forEach((batch)=>{
    const machine=machines.get(batch.machine)||{machine:batch.machine||"Unassigned",batches:0,target:0,output:0,cycle:0,cycleSamples:0,stopped:0,downtime:0};
    machine.batches++;machine.target+=Number(batch.target)||0;machine.output+=Number(batch.actualProduced)||0;if(Number(batch.cycleTime)>0){machine.cycle+=Number(batch.cycleTime);machine.cycleSamples++;}if(batch.machineStatus==="Stopped"||batch.machineStatus==="Maintenance"||["Action Required","Stopped · Reported"].includes(batch.status))machine.stopped++;machine.downtime+=Number(batch.downtimeSeconds)||0;machines.set(batch.machine,machine);
    const key=`${batch.date} · ${batch.shift}`;const shift=shifts.get(key)||{key,batches:0,target:0,output:0,rejected:0};shift.batches++;shift.target+=Number(batch.target)||0;shift.output+=Number(batch.actualProduced)||0;shift.rejected+=Number(batch.actualRejected)||0;shifts.set(key,shift);
  });
  return <section className="panel production-reports"><h2>Dashboards &amp; reports</h2><p className="muted">Production summary, error ratio, machine performance, daily/shift output and BMR register.</p>
    <div className="production-summary"><Summary label="Planned output" value={target.toLocaleString()}/><Summary label="Actual output" value={output.toLocaleString()}/><Summary label="Good quantity" value={good.toLocaleString()}/><Summary label="Rejected quantity" value={rejected.toLocaleString()}/><Summary label="Overall error ratio" value={`${output?(rejected/output*100).toFixed(2):"0.00"}%`}/></div>
    <h3>Error ratio / quality report</h3><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Product</th><th>Shift / machine</th><th>Inspected</th><th>Good</th><th>Rejected</th><th>Error ratio</th><th>QC decision</th></tr></thead><tbody>{checks.length?checks.map(({batch,check,id})=><tr key={id}><td>{batch.id}</td><td>{batch.product}</td><td>{batch.shift} · {batch.machine}</td><td>{check.total}</td><td>{check.good}</td><td>{check.rejected}</td><td>{Number(check.errorRatio).toFixed(2)}%</td><td>{check.outcome}</td></tr>):<tr><td colSpan="8">Quality reports appear after the first inspection.</td></tr>}</tbody></table></div>
    <h3>Machine performance</h3><div className="table-wrap"><table><thead><tr><th>Machine</th><th>Batches</th><th>Planned</th><th>Actual</th><th>Output vs plan</th><th>Avg cycle time (sec/unit)</th><th>Downtime (min)</th><th>Stopped / action batches</th></tr></thead><tbody>{[...machines.values()].length?[...machines.values()].map((row)=><tr key={row.machine}><td>{row.machine}</td><td>{row.batches}</td><td>{row.target}</td><td>{row.output}</td><td>{row.target?(row.output/row.target*100).toFixed(1):"0.0"}%</td><td>{row.cycleSamples?(row.cycle/row.cycleSamples).toFixed(2):"—"}</td><td>{(row.downtime/60).toFixed(1)}</td><td>{row.stopped}</td></tr>):<tr><td colSpan="8">Machine performance appears after batch plans are created.</td></tr>}</tbody></table></div>
    <h3>Daily / shift production report</h3><div className="table-wrap"><table><thead><tr><th>Date / shift</th><th>Batches</th><th>Target</th><th>Actual output</th><th>Rejected</th><th>Completion</th></tr></thead><tbody>{[...shifts.values()].length?[...shifts.values()].map((row)=><tr key={row.key}><td>{row.key}</td><td>{row.batches}</td><td>{row.target}</td><td>{row.output}</td><td>{row.rejected}</td><td>{row.target?(row.output/row.target*100).toFixed(1):"0.0"}%</td></tr>):<tr><td colSpan="6">Daily and shift reports appear after production plans are created.</td></tr>}</tbody></table></div>
    <h3>Material usage</h3><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Material</th><th>Category</th><th>Quantity issued</th><th>GRN lot</th><th>Issue time</th></tr></thead><tbody>{usage.length?usage.map((row)=><tr key={row.id}><td>{row.productionBatchId}</td><td>{row.material}</td><td>{row.category}</td><td>{row.quantity} {row.unit}</td><td>{row.grnId}</td><td>{fmtDate(row.createdAt)}</td></tr>):<tr><td colSpan="6">Material usage is logged when production starts.</td></tr>}</tbody></table></div>
    <h3>BMR register</h3><div className="table-wrap"><table><thead><tr><th>BMR</th><th>Batch No.</th><th>Product / Formula</th><th>Created</th><th>Printed</th><th>Batch status</th><th>Documents</th></tr></thead><tbody>{batches.length?batches.map((row)=><tr key={row.id}><td>{row.id}</td><td>{row.batchNo||"—"}</td><td>{row.product} · {row.formulaName||"Formula pending"}</td><td>{fmtDate(row.bmrGeneratedAt)}</td><td>{fmtDate(row.bmrPrintedAt)}</td><td>{row.status}</td><td>{(row.attachments||[]).length}</td></tr>):<tr><td colSpan="7">BMR register is empty.</td></tr>}</tbody></table></div>
  </section>;
}
