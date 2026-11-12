import { Link, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, Boxes, CircleCheck, Clock3, Factory,
  Package, Play, ShieldCheck, ThumbsUp, TrendingUp,
} from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { PanelHeading, PageHeader, StatusBadge, Trend } from "../components/factoryUI";
import "../styles/pages/dashboard.css";

// These percentages align the visible bar heights to the labels on the 5k scale.
const output = [72, 81, 75.4, 87.6, 88.2, 90.4, 92];
const days = ["09 Oct", "10 Oct", "11 Oct", "12 Oct", "13 Oct", "14 Oct", "15 Oct"];

export default function Dashboard() {
  const { data } = useFactory();
  const navigate = useNavigate();
  const running = data.batches.filter((batch) => batch.status === "In progress").length;
  const lowStock = data.inventory.filter((item) => item.status === "Low stock");
  const metrics = [
    { label: "Machines running", value: "7 / 10", note: "3 machines idle", icon: Factory, tone: "green", trend: "+1 shift" },
    { label: "Production today", value: "4,600 pcs", note: "of 5,000 planned", icon: Boxes, tone: "sage", trend: "92% of target" },
    { label: "Good quantity", value: "4,420 pcs", note: "96.1% first-pass yield", icon: ThumbsUp, tone: "blue", trend: "+2.4%" },
    { label: "Rejection ratio", value: "4.68%", note: "Target below 5%", icon: ShieldCheck, tone: "amber", trend: "Within limit" },
  ];

  return <div className="page-enter dashboard-page">
    <PageHeader eyebrow="THURSDAY, 15 OCTOBER 2026 · SHIFT A" title="Factory overview" subtitle="A clear view of production, materials and quality across Plant 01." action="Production floor" onAction={() => document.getElementById("live-production")?.scrollIntoView({ behavior: "smooth" })} icon={Play} />

    <section className="metric-grid" aria-label="Today's factory summary">
      {metrics.map(({ label, value, note, icon: Icon, tone, trend }) => <article className="metric-card" key={label}>
        <div className="metric-card-top"><span className={`metric-icon tone-${tone}`}><Icon size={18} /></span><Trend direction={label === "Rejection ratio" ? "down" : "up"}>{trend}</Trend></div>
        <div className="metric-label">{label}</div><strong className="metric-value">{value}</strong><div className="metric-note">{note}</div>
      </article>)}
    </section>

    <section className="dashboard-main-grid">
      <article className="dashboard-panel output-panel">
        <PanelHeading title="Production output" subtitle="Units completed per day · this week" action="View production" onAction={() => navigate("/production")} />
        <div className="output-legend"><span><i className="legend-swatch output-swatch" /> Output</span><span><i className="legend-swatch target-swatch" /> Daily target</span><strong><TrendingUp size={14} /> +8.6% <small>vs last week</small></strong></div>
        <div className="output-chart" role="img" aria-label="Production output rose through the week, reaching 4,600 pieces today against a 5,000 piece target">
          <div className="chart-axis"><span>5k</span><span>4k</span><span>3k</span><span>2k</span><span>1k</span></div>
          <div className="chart-plot"><div className="target-line"><span>5,000 target</span></div><div className="chart-columns">{output.map((height, index) => <div className={`chart-day ${index === output.length - 1 ? "today" : ""}`} key={days[index]}><div className="chart-bar-wrap"><div className="chart-bar" style={{ height: `${height}%` }}><span>{index === 6 ? "4,600" : ""}</span></div></div><small>{days[index]}</small></div>)}</div></div>
        </div>
      </article>

      <article className="dashboard-panel shift-panel">
        <PanelHeading title="Shift at a glance" subtitle="Day shift · 08:00–16:00" action="Open reports" onAction={() => navigate("/reports")} />
        <div className="shift-progress"><div className="shift-progress-top"><span><Clock3 size={14} /> Shift progress</span><strong>5h 20m <small>of 8h</small></strong></div><div className="progress-track"><i style={{ width: "66%" }} /></div><div className="shift-progress-foot"><span>Started 08:00</span><span>Ends 16:00</span></div></div>
        <div className="shift-stat-row"><div><span className="shift-stat-icon"><Play size={14} /></span><strong>{running}<small>Running batches</small></strong></div><div><span className="shift-stat-icon gold"><CircleCheck size={14} /></span><strong>12<small>Completed today</small></strong></div></div>
        <div className="shift-quality"><span className="quality-check-icon"><ShieldCheck size={17} /></span><span><strong>Quality is on track</strong><small>Rejection rate is below the 5% alert threshold.</small></span><CircleCheck size={16} /></div>
      </article>
    </section>

    <section className="dashboard-lower-grid">
      <article id="live-production" className="dashboard-panel live-production-panel">
        <PanelHeading title="Live production" subtitle="Current batch activity" action="All batches" onAction={() => navigate("/production")} />
        <div className="live-batches">{data.batches.slice(0, 3).map((batch, index) => <div className="live-batch" key={batch.id}>
          <div className={`batch-symbol batch-symbol-${index}`}><Factory size={17} /></div><div className="batch-copy"><div className="batch-name-row"><strong>{batch.product}</strong><StatusBadge>{batch.status}</StatusBadge></div><span>{batch.id} <i>·</i> {batch.line} <i>·</i> {batch.operator}</span><div className="batch-progress-track"><i style={{ width: `${Math.round((batch.actual / batch.target) * 100)}%` }} /></div><small>{batch.actual.toLocaleString()} of {batch.target.toLocaleString()} pcs <b>{Math.round((batch.actual / batch.target) * 100)}%</b></small></div>
        </div>)}</div>
      </article>
      <article className="dashboard-panel alerts-panel">
        <PanelHeading title="Inventory alerts" subtitle={`${lowStock.length} items need attention`} action="Open inventory" onAction={() => navigate("/inventory")} />
        <div className="inventory-alert-list">{lowStock.map((item) => <div className="inventory-alert" key={item.id}><span className="alert-icon"><AlertTriangle size={15} /></span><span className="alert-copy"><strong>{item.name}</strong><small>{item.id} <i>·</i> Minimum {item.minimum} {item.unit}</small></span><span className="alert-stock"><strong>{item.stock} {item.unit}</strong><small>On hand</small></span></div>)}</div>
        <Link to="/purchasing" className="reorder-link"><Package size={15} /> Create a purchase order <ArrowRight size={15} /></Link>
      </article>
    </section>

    <div className="demo-notice"><Activity size={15} /><span><strong>Demo data</strong> Dashboard figures are illustrative and saved locally in this browser.</span><Link to="/reports">How reports work <ArrowRight size={14} /></Link></div>
  </div>;
}
