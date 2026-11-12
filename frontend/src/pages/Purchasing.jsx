import { useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardList, Truck } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { NewRecordDialog, PageHeader, RecordTable, SearchFilter, StatusBadge } from "../components/factoryUI";
import "../styles/pages/purchasing.css";

const orderFields = [
  { key: "supplier", label: "Supplier", full: true },
  { key: "items", label: "Items ordered", full: true },
  { key: "date", label: "Order date", defaultValue: "15 Oct 2026" },
  { key: "expected", label: "Expected delivery", defaultValue: "22 Oct 2026" },
  { key: "value", label: "Order value", placeholder: "₹ 0" },
  { key: "status", label: "Status", options: ["Awaiting approval", "Approved", "Awaiting delivery"] },
];

export default function Purchasing() {
  const { data, addRecord, updateRecord } = useFactory();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All orders");
  const [adding, setAdding] = useState(false);
  const orders = useMemo(() => data.purchaseOrders.filter((order) =>
    (status === "All orders" || order.status === status) &&
    `${order.id} ${order.supplier} ${order.items}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.purchaseOrders, status, query]);

  const progress = { "Awaiting approval": "Approved", Approved: "Awaiting delivery", "Awaiting delivery": "Received", "Quality check": "Received", Received: "Received" };
  const columns = [
    { key: "id", label: "Order", render: (order) => <div className="primary-cell"><span className="cell-icon purchase-icon"><ClipboardList size={15} /></span><span>{order.id}<small>Placed {order.date}</small></span></div> },
    { key: "supplier", label: "Supplier", render: (order) => <strong className="table-strong">{order.supplier}</strong> },
    { key: "items", label: "Order details" },
    { key: "expected", label: "Expected" },
    { key: "value", label: "Value", render: (order) => <strong className="order-value">{order.value}</strong> },
    { key: "status", label: "Status", render: (order) => <StatusBadge>{order.status}</StatusBadge> },
    { key: "action", label: "Demo action", render: (order) => order.status !== "Received" && <button className="row-action" aria-label={`Advance ${order.id} status`} onClick={() => updateRecord("purchaseOrders", order.id, { status: progress[order.status] })}>{order.status === "Awaiting approval" ? <><Check size={13} /> Approve</> : order.status === "Approved" ? <><Truck size={13} /> Dispatch</> : <><ArrowRight size={13} /> Receive</>}</button> },
  ];
  const awaiting = data.purchaseOrders.filter((order) => order.status === "Awaiting delivery").length;
  const value = data.purchaseOrders.reduce((sum, order) => sum + (Number(String(order.value).replace(/[^0-9.]/g, "")) || 0), 0);

  return <div className="page-enter purchasing-page">
    <PageHeader title="Purchasing" subtitle="Manage supplier orders and follow each delivery through receiving." action="Create purchase order" onAction={() => setAdding(true)} />
    <section className="summary-strip">
      <div className="summary-chip"><span>Open purchase orders</span><strong>{data.purchaseOrders.filter((order) => order.status !== "Received").length}</strong></div>
      <div className="summary-chip"><span>Awaiting delivery</span><strong>{awaiting}</strong></div>
      <div className="summary-chip"><span>Pending quality check</span><strong>{data.purchaseOrders.filter((order) => order.status === "Quality check").length}</strong></div>
      <div className="summary-chip"><span>Sample order value</span><strong>₹ {(value / 1000).toFixed(1)}k</strong></div>
    </section>
    <div className="purchase-flow"><div><span className="flow-number">01</span><span><strong>Purchase request</strong><small>Prepare supplier order</small></span></div><i /><div><span className="flow-number">02</span><span><strong>Receive goods</strong><small>Record delivery & quantity</small></span></div><i /><div><span className="flow-number">03</span><span><strong>Quality review</strong><small>Release to inventory</small></span></div></div>
    <section className="table-panel">
      <SearchFilter value={query} onChange={setQuery} placeholder="Search order, supplier or item…">
        <select aria-label="Filter orders by status" value={status} onChange={(event) => setStatus(event.target.value)}><option>All orders</option><option>Awaiting approval</option><option>Approved</option><option>Awaiting delivery</option><option>Quality check</option><option>Received</option></select>
        <span className="filter-count">{orders.length} orders</span>
      </SearchFilter>
      <RecordTable columns={columns} rows={orders} noun="orders" empty="No purchase orders match this view." />
    </section>
    <div className="soft-callout purchase-note"><Truck size={16} /><span><strong>Receiving workflow</strong> When an order arrives, record the received quantity and send raw materials or packaging to quality inspection before updating available stock.</span></div>
    {adding && <NewRecordDialog title="Create purchase order" fields={orderFields} onClose={() => setAdding(false)} onSave={(record) => addRecord("purchaseOrders", record)} submitLabel="Create order" />}
  </div>;
}
