import { useMemo, useState } from "react";
import { Boxes, Package, Warehouse } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { NewRecordDialog, PageHeader, RecordTable, SearchFilter, StatusBadge } from "../components/factoryUI";
import "../styles/pages/inventory.css";

const fields = [
  { key: "name", label: "Material or product name", full: true },
  { key: "category", label: "Category", options: ["Raw material", "Packaging", "Finished goods"] },
  { key: "lot", label: "Lot / batch number" },
  { key: "stock", label: "Current quantity", type: "number" },
  { key: "unit", label: "Unit", options: ["kg", "L", "pcs", "g"] },
  { key: "minimum", label: "Minimum stock level", type: "number" },
  { key: "location", label: "Storage location" },
  { key: "supplier", label: "Supplier", required: false },
];

export default function Inventory() {
  const { data, addRecord } = useFactory();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stockState, setStockState] = useState("All stock");
  const [adding, setAdding] = useState(false);
  const items = useMemo(() => data.inventory.filter((item) =>
    (category === "All categories" || item.category === category) &&
    (stockState === "All stock" || item.status === stockState) &&
    `${item.id} ${item.name} ${item.lot} ${item.supplier}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.inventory, category, stockState, query]);

  const columns = [
    { key: "item", label: "Item", render: (item) => <div className="primary-cell"><span className="cell-icon"><Package size={15} /></span><span>{item.name}<small>{item.id} · {item.category}</small></span></div> },
    { key: "lot", label: "Lot number" },
    { key: "stock", label: "On hand", render: (item) => <strong className={`stock-value ${item.status === "Low stock" ? "stock-low" : ""}`}>{Number(item.stock).toLocaleString()} <small>{item.unit}</small></strong> },
    { key: "minimum", label: "Reorder at", render: (item) => `${item.minimum} ${item.unit}` },
    { key: "location", label: "Location" },
    { key: "supplier", label: "Supplier" },
    { key: "status", label: "Status", render: (item) => <StatusBadge>{item.status}</StatusBadge> },
  ];
  const lowCount = data.inventory.filter((item) => item.status === "Low stock").length;
  const totalRaw = data.inventory.filter((item) => item.category === "Raw material").length;
  const totalFinished = data.inventory.filter((item) => item.category === "Finished goods").length;

  return <div className="page-enter inventory-page">
    <PageHeader title="Inventory" subtitle="Track raw materials, packaging and finished goods across your plant." action="Add inventory item" onAction={() => setAdding(true)} />
    <section className="summary-strip">
      <div className="summary-chip"><span>Total tracked items</span><strong>{data.inventory.length}</strong></div>
      <div className="summary-chip"><span>Raw materials</span><strong>{totalRaw}</strong></div>
      <div className="summary-chip"><span>Finished goods</span><strong>{totalFinished}</strong></div>
      <div className="summary-chip inventory-attention"><span>Below reorder level</span><strong>{lowCount}<small> needs attention</small></strong></div>
    </section>
    <section className="table-panel">
      <SearchFilter value={query} onChange={setQuery} placeholder="Search materials, lot number, supplier…">
        <select aria-label="Filter by inventory category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option><option>Raw material</option><option>Packaging</option><option>Finished goods</option></select>
        <select aria-label="Filter by stock status" value={stockState} onChange={(event) => setStockState(event.target.value)}><option>All stock</option><option>In stock</option><option>Low stock</option></select>
        <span className="filter-count">{items.length} items</span>
      </SearchFilter>
      <RecordTable columns={columns} rows={items} noun="items" empty="No inventory items found." />
    </section>
    <div className="inventory-footnote"><Warehouse size={15} /><span><strong>Stock locations</strong> · RM raw materials &nbsp;·&nbsp; PK packaging &nbsp;·&nbsp; FG finished goods</span><span className="footnote-sync"><Boxes size={14} /> Updated just now</span></div>
    {adding && <NewRecordDialog title="Add inventory item" fields={fields} onClose={() => setAdding(false)} onSave={(values) => addRecord("inventory", { ...values, stock: Number(values.stock), minimum: Number(values.minimum), status: Number(values.stock) < Number(values.minimum) ? "Low stock" : "In stock" })} />}
  </div>;
}
