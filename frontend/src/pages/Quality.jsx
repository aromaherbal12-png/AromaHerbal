import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, ClipboardCheck, FlaskConical, ShieldAlert } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { NewRecordDialog, PageHeader, RecordTable, SearchFilter, StatusBadge } from "../components/factoryUI";
import "../styles/pages/quality.css";

const checkFields = [
  { key: "material", label: "Material or product", full: true },
  { key: "lot", label: "Lot number" },
  { key: "supplier", label: "Supplier" },
  { key: "received", label: "Received date", defaultValue: "15 Oct 2026" },
  { key: "inspector", label: "Assigned inspector" },
  { key: "status", label: "Initial status", options: ["Under test", "On hold"] },
];

export default function Quality() {
  const { data, addRecord, updateRecord } = useFactory();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All checks");
  const [adding, setAdding] = useState(false);
  const checks = useMemo(() => data.qualityChecks.filter((check) =>
    (status === "All checks" || check.status === status) &&
    `${check.id} ${check.material} ${check.lot} ${check.supplier} ${check.inspector}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.qualityChecks, status, query]);

  const columns = [
    { key: "id", label: "Inspection", render: (check) => <div className="primary-cell"><span className="cell-icon quality-icon"><FlaskConical size={15} /></span><span>{check.id}<small>Received {check.received}</small></span></div> },
    { key: "material", label: "Material", render: (check) => <strong className="table-strong">{check.material}</strong> },
    { key: "lot", label: "Lot number" },
    { key: "supplier", label: "Supplier" },
    { key: "inspector", label: "Inspector" },
    { key: "status", label: "QC status", render: (check) => <StatusBadge>{check.status}</StatusBadge> },
    { key: "action", label: "Demo action", render: (check) => check.status === "Under test" ? <button className="row-action quality-action" onClick={() => updateRecord("qualityChecks", check.id, { status: "Approved" })}><BadgeCheck size={13} /> Approve</button> : check.status === "On hold" ? <span className="hold-label"><ShieldAlert size={13} /> Review needed</span> : <span className="approved-label"><BadgeCheck size={13} /> Released</span> },
  ];

  const pending = data.qualityChecks.filter((check) => check.status === "Under test").length;
  const approved = data.qualityChecks.filter((check) => check.status === "Approved").length;
  const held = data.qualityChecks.filter((check) => check.status === "On hold").length;

  return <div className="page-enter quality-page">
    <PageHeader title="Quality control" subtitle="Inspect incoming materials and finished batches before they move forward." action="Start quality check" onAction={() => setAdding(true)} />
    <section className="summary-strip">
      <div className="summary-chip"><span>Checks in queue</span><strong>{pending}</strong></div>
      <div className="summary-chip"><span>Approved this cycle</span><strong>{approved}</strong></div>
      <div className="summary-chip"><span>On hold</span><strong>{held}</strong></div>
      <div className="summary-chip"><span>Release requirement</span><strong>QC pass</strong></div>
    </section>
    <div className="quality-flow"><div className="quality-flow-title"><ShieldAlert size={15} /><strong>Material release gate</strong><span>Quarantined stock stays out of usable inventory until an inspector records a pass.</span></div><div className="quality-flow-steps"><span className="step-done"><i>1</i> Receive & label</span><b>→</b><span className="step-current"><i>2</i> Inspect sample</span><b>→</b><span><i>3</i> Approve or hold</span><b>→</b><span><i>4</i> Release to stock</span></div></div>
    <section className="table-panel">
      <SearchFilter value={query} onChange={setQuery} placeholder="Search inspection, material, supplier…">
        <select aria-label="Filter quality inspections by status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All checks</option><option>Under test</option><option>Approved</option><option>On hold</option></select>
        <span className="filter-count">{checks.length} inspections</span>
      </SearchFilter>
      <RecordTable columns={columns} rows={checks} noun="checks" empty="No quality checks match this view." />
    </section>
    <div className="quality-bottom-note"><ClipboardCheck size={15} /><span>Record sample test results, quarantine period and inspector notes in the production backend.</span><button onClick={() => document.querySelector(".quality-flow")?.scrollIntoView({ behavior: "smooth" })}>Review release flow <ArrowRight size={14} /></button></div>
    {adding && <NewRecordDialog title="Start quality check" fields={checkFields} onClose={() => setAdding(false)} onSave={(record) => addRecord("qualityChecks", record)} submitLabel="Create inspection" />}
  </div>;
}
