import { useState } from "react";
import { ArrowDownToLine, BarChart3, CalendarDays, CircleCheck, FileText, Package, ShieldCheck, TrendingUp } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { PageHeader } from "../components/factoryUI";
import "../styles/pages/reports.css";

const weekly = [
  { day: "09 Oct", plan: 3900, actual: 3600 }, { day: "10 Oct", plan: 4200, actual: 4050 },
  { day: "11 Oct", plan: 4100, actual: 3770 }, { day: "12 Oct", plan: 4600, actual: 4380 },
  { day: "13 Oct", plan: 4700, actual: 4410 }, { day: "14 Oct", plan: 4800, actual: 4520 },
  { day: "15 Oct", plan: 5000, actual: 4600 },
];
const monthly = [
  { day: "Week 1", plan: 21800, actual: 20420 },
  { day: "Week 2", plan: 22400, actual: 21230 },
  { day: "Week 3", plan: 23200, actual: 21840 },
  { day: "Week 4", plan: 24100, actual: 22960 },
];

function downloadCsv(records) {
  const header = ["Batch", "Product", "Lot", "Target quantity", "Actual quantity", "Production line", "Status"];
  const rows = records.map((batch) => [batch.id, batch.product, batch.lot, batch.target, batch.actual, batch.line, batch.status]);
  const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "aroma-production-demo.csv";
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export default function Reports() {
  const { data } = useFactory();
  const [range, setRange] = useState("This week");
  const selectedBars = range === "Today" ? weekly.slice(-1) : range === "This month" ? monthly : weekly;
  const totalTarget = selectedBars.reduce((sum, item) => sum + item.plan, 0);
  const totalOutput = selectedBars.reduce((sum, item) => sum + item.actual, 0);
  const goodQty = 4420;
  const rejectedQty = 230;
  const max = Math.max(...selectedBars.map((item) => item.plan));
  const periodLabel = range === "Today" ? "15 Oct 2026" : range === "This month" ? "01–31 Oct 2026" : "09–15 Oct 2026";
  const periodTrend = range === "Today" ? "+4.1% vs yesterday" : range === "This month" ? "+6.2% vs last month" : "+8.6% vs last week";

  return <div className="page-enter reports-page">
    <PageHeader title="Reports & insights" subtitle="Production, material and quality summaries for your factory." action="Export production CSV" onAction={() => downloadCsv(data.batches)} icon={ArrowDownToLine} />
    <div className="report-toolbar"><span><CalendarDays size={15} /> Report period</span><select aria-label="Choose report period" value={range} onChange={(event) => setRange(event.target.value)}><option>This week</option><option>This month</option><option>Today</option></select><small>Demo figures · {periodLabel}</small></div>
    <section className="report-metrics">
      <article><span className="report-metric-icon green"><BarChart3 size={17} /></span><span><small>Production output</small><strong>{totalOutput.toLocaleString()} <i>pcs</i></strong><em><TrendingUp size={11} /> {periodTrend}</em></span></article>
      <article><span className="report-metric-icon sage"><CircleCheck size={17} /></span><span><small>Good quantity · today</small><strong>{goodQty.toLocaleString()} <i>pcs</i></strong><em>96.1% first-pass yield</em></span></article>
      <article><span className="report-metric-icon amber"><ShieldCheck size={17} /></span><span><small>Rejected quantity · today</small><strong>{rejectedQty} <i>pcs</i></strong><em>4.68% rejection ratio</em></span></article>
      <article><span className="report-metric-icon blue"><Package size={17} /></span><span><small>Inventory alerts</small><strong>{data.inventory.filter((item) => item.status === "Low stock").length} <i>items</i></strong><em>Below reorder threshold</em></span></article>
    </section>
    <section className="report-grid">
      <article className="panel-card report-chart-card">
        <div className="panel-heading"><div><h2>Plan vs actual production</h2><p>Daily production quantity across the selected period</p></div><span className="report-chart-total">{Math.round((totalOutput / totalTarget) * 100)}%<small>of plan</small></span></div>
        <div className="report-legend"><span><i className="report-plan-swatch" /> Planned</span><span><i className="report-actual-swatch" /> Actual</span></div>
        <div className={`report-bar-chart ${selectedBars.length === 1 ? "single-bar-day" : ""}`}>{selectedBars.map((item, index) => <div className="report-chart-day" key={item.day}><div className="report-bars"><i className="plan-bar" style={{ height: `${(item.plan / max) * 100}%` }} /><i className={`actual-bar ${index === selectedBars.length - 1 ? "is-today" : ""}`} style={{ height: `${(item.actual / max) * 100}%` }} /></div><small>{item.day}</small></div>)}</div>
        <div className="report-chart-caption"><span><strong>{totalOutput.toLocaleString()}</strong> pcs actual output</span><span><strong>{totalTarget.toLocaleString()}</strong> pcs planned quantity</span></div>
      </article>
      <article className="panel-card quality-summary-card">
        <div className="panel-heading"><div><h2>Quality summary</h2><p>Today's production disposition</p></div><ShieldCheck size={18} /></div>
        <div className="quality-donut-area"><div className="quality-donut"><div><strong>4.68%</strong><small>Rejected</small></div></div><div className="quality-legend"><div><i className="good-swatch" /><span>Good quantity<small>Approved product</small></span><strong>{goodQty.toLocaleString()}</strong></div><div><i className="reject-swatch" /><span>Rejected<small>Needs review</small></span><strong>{rejectedQty}</strong></div><div><i className="pending-swatch" /><span>Pending QC<small>Awaiting release</small></span><strong>{data.qualityChecks.filter((check) => check.status === "Under test").length} lots</strong></div></div></div>
        <div className="quality-summary-footer"><ShieldCheck size={14} /> Overall quality within the 5% alert limit</div>
      </article>
    </section>
    <section className="report-bottom-grid">
      <article className="panel-card report-source-card"><div className="panel-heading"><div><h2>Production by line</h2><p>Output recorded for open batch records</p></div></div><div className="line-list">{["Filling line 01", "Filling line 02", "Cream line 01", "Cream line 02"].map((line, index) => { const matching = data.batches.filter((batch) => batch.line === line); const count = matching.reduce((sum, batch) => sum + Number(batch.actual), 0); const maxLine = Math.max(1, ...data.batches.map((batch) => Number(batch.actual))); return <div key={line}><span>{line}<small>{matching.length} batches</small></span><i><b style={{ width: `${Math.max(8, count / maxLine * 100)}%`, opacity: 1 - index * .11 }} /></i><strong>{count.toLocaleString()} pcs</strong></div>; })}</div></article>
      <article className="panel-card report-note-card"><div className="panel-heading"><div><h2>Report notes</h2><p>Important items from the sample dataset</p></div><FileText size={17} /></div><div className="report-notes"><div><span className="note-bullet note-green" /><span><strong>Production is near plan</strong><small>{totalOutput.toLocaleString()} of {totalTarget.toLocaleString()} pcs recorded in open batches.</small></span></div><div><span className="note-bullet note-amber" /><span><strong>3 inventory items are below minimum</strong><small>Review raw material and packaging reorder levels.</small></span></div><div><span className="note-bullet note-blue" /><span><strong>2 material lots are under test</strong><small>Release to usable inventory after quality approval.</small></span></div></div></article>
    </section>
    <div className="report-disclaimer"><FileText size={14} /> This report uses sample values for interface preview. The production backend can provide live calculations.</div>
  </div>;
}
