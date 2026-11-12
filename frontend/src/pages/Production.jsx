import { useMemo, useState } from "react";
import { ArrowRight, Factory, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { NewRecordDialog, PageHeader, RecordTable, SearchFilter, StatusBadge } from "../components/factoryUI";
import "../styles/pages/production.css";

const batchFields = [
  { key: "product", label: "Product", full: true },
  { key: "lot", label: "Batch / lot number" },
  { key: "target", label: "Target quantity", type: "number" },
  { key: "line", label: "Production line", options: ["Filling line 01", "Filling line 02", "Cream line 01", "Cream line 02"] },
  { key: "operator", label: "Assigned operator" },
  { key: "started", label: "Start time", defaultValue: "11:00" },
];

export default function Production() {
  const { data, addRecord, updateRecord } = useFactory();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All batches");
  const [adding, setAdding] = useState(false);
  const batches = useMemo(() => data.batches.filter((batch) =>
    (status === "All batches" || batch.status === status) &&
    `${batch.id} ${batch.product} ${batch.lot} ${batch.line} ${batch.operator}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.batches, status, query]);

  const controls = (batch) => {
    const isRunning = batch.status === "In progress";
    if (batch.status === "Completed") return <span className="completed-control">Batch closed</span>;
    const label = batch.status === "Quality check" ? "Complete" : isRunning ? "Pause" : "Resume";
    return <button className={`batch-control ${isRunning ? "pause" : "resume"}`} onClick={() => updateRecord("batches", batch.id, { status: batch.status === "Quality check" ? "Completed" : isRunning ? "Stopped" : "In progress" })} aria-label={`${label} ${batch.id}`}>{isRunning ? <Pause size={12} /> : batch.status === "Quality check" ? <ArrowRight size={12} /> : <Play size={12} />}{label}</button>;
  };
  const columns = [
    { key: "id", label: "Batch / BMR", render: (batch) => <div className="primary-cell"><span className="cell-icon batch-icon"><Factory size={15} /></span><span>{batch.id}<small>{batch.lot} · {batch.started}</small></span></div> },
    { key: "product", label: "Product", render: (batch) => <strong className="table-strong">{batch.product}</strong> },
    { key: "line", label: "Production line" },
    { key: "output", label: "Output", render: (batch) => <div className="table-progress"><div><span>{Number(batch.actual).toLocaleString()} / {Number(batch.target).toLocaleString()} pcs</span><b>{Math.round((batch.actual / batch.target) * 100)}%</b></div><i><em style={{ width: `${Math.min(100, (batch.actual / batch.target) * 100)}%` }} /></i></div> },
    { key: "operator", label: "Operator" },
    { key: "status", label: "Status", render: (batch) => <StatusBadge>{batch.status}</StatusBadge> },
    { key: "control", label: "Demo control", render: controls },
  ];

  const active = data.batches.filter((batch) => batch.status === "In progress").length;
  const completed = data.batches.filter((batch) => batch.status === "Completed").length;
  const totalTarget = data.batches.reduce((sum, batch) => sum + Number(batch.target), 0);
  const totalActual = data.batches.reduce((sum, batch) => sum + Number(batch.actual), 0);

  return <div className="page-enter production-page">
    <PageHeader title="Production" subtitle="Plan work orders, follow batch progress and record output on the floor." action="Generate BMR" onAction={() => setAdding(true)} />
    <section className="summary-strip">
      <div className="summary-chip"><span>Planned today</span><strong>5,000 <small>pcs</small></strong></div>
      <div className="summary-chip"><span>Actual output</span><strong>4,600 <small>pcs</small></strong></div>
      <div className="summary-chip"><span>Active batches</span><strong>{active}</strong></div>
      <div className="summary-chip"><span>Completed batches</span><strong>{completed}</strong></div>
    </section>
    <section className="production-focus">
      <div className="focus-title"><span className="focus-icon"><Gauge size={17} /></span><span><strong>Batch record progress</strong><small>Shift A · 15 October · {data.batches.length} batch records</small></span></div>
      <div className="focus-progress"><div><span>Listed batch output</span><strong>{totalActual.toLocaleString()} <small>/ {totalTarget.toLocaleString()} pcs</small></strong></div><div className="focus-track"><i style={{ width: `${Math.min(100, (totalActual / totalTarget) * 100)}%` }} /></div><small>{Math.round((totalActual / totalTarget) * 100)}% of listed batch quantity</small></div>
      <div className="focus-machine"><span className="online-pulse" /><span><strong>Line status</strong><small>7 of 10 machines running</small></span><button onClick={() => document.getElementById("batch-list")?.scrollIntoView({ behavior: "smooth" })}>Floor view <ArrowRight size={13} /></button></div>
    </section>
    <section className="table-panel" id="batch-list">
      <SearchFilter value={query} onChange={setQuery} placeholder="Search batch, product, line or operator…">
        <select aria-label="Filter production batches by status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All batches</option><option>In progress</option><option>Stopped</option><option>Quality check</option><option>Completed</option></select>
        <span className="filter-count">{batches.length} batches</span>
      </SearchFilter>
      <RecordTable columns={columns} rows={batches} noun="batches" empty="No production batches match this view." />
    </section>
    <div className="production-help"><RotateCcw size={14} /><span>Demo controls change the batch status in this browser. Production counts are illustrative.</span><span className="production-help-end"><Play size={12} /> {totalTarget ? Math.round((totalActual / totalTarget) * 100) : 0}% planned output</span></div>
    {adding && <NewRecordDialog title="Generate batch record" fields={batchFields} onClose={() => setAdding(false)} onSave={(record) => addRecord("batches", { ...record, target: Number(record.target), actual: 0, status: "In progress" })} submitLabel="Generate BMR" />}
  </div>;
}
