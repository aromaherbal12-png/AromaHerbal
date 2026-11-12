import { useState } from "react";
import { Printer, Box } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  PageHeading,
  SearchInput,
  Tabs,
  Badge,
  DataTable,
  RowActions,
  ConfirmDelete,
  Modal,
  Button,
} from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { dateLabel, money } from "../utils/format";
export default function Invoices() {
  const { data, remove } = useCRM();
  const [tab, setTab] = useState("All invoices"),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [selected, setSelected] = useState(null);
  const rows = data.invoices.filter(
    (i) =>
      (tab === "All invoices" || i.status === tab) &&
      `${i.number} ${i.customer}`.toLowerCase().includes(search.toLowerCase()),
  );
  const columns = [
    {
      key: "number",
      label: "Invoice #",
      render: (i) => (
        <button
          className="table-name invoice-link"
          onClick={() => setSelected(i)}
        >
          {i.number}
        </button>
      ),
    },
    { key: "customer", label: "Customer" },
    {
      key: "amount",
      label: "Amount",
      render: (i) => <strong>{money(i.amount, data.settings.currency)}</strong>,
    },
    {
      key: "date",
      label: "Date",
      render: (i) => dateLabel(i.date, data.settings.dateFormat),
    },
    {
      key: "status",
      label: "Status",
      render: (i) => <Badge value={i.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (i) => (
        <RowActions
          onEdit={() => setEditing(i)}
          onDelete={() => setDeleting(i)}
        />
      ),
    },
  ];
  return (
    <div className="page-enter">
      <PageHeading
        title="Invoices"
        subtitle="Create invoices and track payment status."
        action="Create Invoice"
        onAction={() =>
          setEditing({
            number: `INV-${String(Math.max(0, ...data.invoices.map((i) => Number(i.number.replace(/\D/g, "")) || 0)) + 1).padStart(4, "0")}`,
          })
        }
      />
      <div className="invoice-summary">
        {["Paid", "Pending", "Overdue"].map((status) => (
          <div key={status}>
            <Badge value={status} />
            <strong>
              {money(
                data.invoices
                  .filter((i) => i.status === status)
                  .reduce((s, i) => s + Number(i.amount), 0),
                data.settings.currency,
              )}
            </strong>
            <span>
              {data.invoices.filter((i) => i.status === status).length} invoices
            </span>
          </div>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="toolbar">
          <Tabs
            items={["All invoices", "Paid", "Pending", "Overdue"]}
            value={tab}
            onChange={setTab}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoices…"
          />
        </div>
        <DataTable columns={columns} rows={rows} noun="invoices" />
      </section>
      {editing && (
        <RecordModal
          entity="invoices"
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {deleting && (
        <ConfirmDelete
          name={deleting.number}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("invoices", deleting.id)}
        />
      )}{" "}
      {selected && (
        <Modal title={selected.number} wide onClose={() => setSelected(null)}>
          <div className="invoice-document">
            <div className="invoice-document-header">
              <div>
                <Box size={28} />
                <h2>BNB Core</h2>
              </div>
              <Badge value={selected.status} />
            </div>
            <div className="invoice-billing">
              <div>
                <small>BILL TO</small>
                <h3>{selected.customer}</h3>
              </div>
              <div>
                <p>
                  Issued: {dateLabel(selected.date, data.settings.dateFormat)}
                </p>
                <p>
                  Due: {dateLabel(selected.dueDate, data.settings.dateFormat)}
                </p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selected.description || "Professional services"}</td>
                  <td>{money(selected.amount, data.settings.currency)}</td>
                </tr>
              </tbody>
            </table>
            <div className="invoice-total">
              Total{" "}
              <strong>{money(selected.amount, data.settings.currency)}</strong>
            </div>
            <p className="invoice-thanks">Thank you for your business.</p>
          </div>
          <footer>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print invoice
            </Button>
            <Button
              onClick={() => {
                setEditing(selected);
                setSelected(null);
              }}
            >
              Edit invoice
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
