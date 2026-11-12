import { useEffect, useState } from "react";
import { useCRM } from "../context/CRMContext";
import { PageHeading, SearchInput, Tabs, Badge, DataTable, Modal, Button } from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { dateLabel } from "../utils/format";
import { paymentRows, paymentMoney, todayInZone } from "../utils/payments";

export default function Payments() {
  const { data, save, notify } = useCRM();
  const [tab, setTab] = useState("Unpaid"), [search, setSearch] = useState(""), [editing, setEditing] = useState(null), [selected, setSelected] = useState(null), [confirm, setConfirm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [today, setToday] = useState(() => todayInZone(data.settings.timezone));
  useEffect(() => {
    const refresh = () => setToday(todayInZone(data.settings.timezone));
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [data.settings.timezone]);
  const all = paymentRows(data.customers, today);
  const rows = all.filter(r => (tab === "Unpaid" ? !r.paidAt : r.status === tab) && `${r.customer.name} ${r.customer.company}`.toLowerCase().includes(search.toLowerCase()));
  const amount = value => paymentMoney(value, data.settings.currency);
  const date = value => dateLabel(value, data.settings.dateFormat);
  const message = selected ? `Hi ${selected.customer.name},\n\nThis is a reminder that your ${selected.customer.paymentPlan.mode === "EMI" ? `EMI ${selected.index + 1}` : "project payment"} of ${amount(selected.amount)} for ${selected.customer.company} is due on ${date(selected.dueDate)}.\n\nPlease let us know once the payment is made. Thank you!\nBNB Core` : "";
  const changePayment = async (close) => {
    if (busy) return;
    setBusy(true); setError("");
    const customer = data.customers.find(c => c.id === confirm.customer.id);
    try {
      if (!customer) throw new Error("Customer no longer exists");
      const paid = { ...customer.paymentPlan.paid };
      if (confirm.paidAt) delete paid[confirm.index];
      else paid[confirm.index] = todayInZone(data.settings.timezone);
      await save("customers", { ...customer, paymentPlan: { ...customer.paymentPlan, paid } });
      close();
    } catch { setError("Could not update the payment. Please try again."); }
    finally { setBusy(false); }
  };
  const columns = [
    { key: "customer", label: "Customer", render: r => <button className="table-name" onClick={() => setEditing(r.customer)}>{r.customer.name}</button> },
    { key: "payment", label: "Payment", render: r => r.customer.paymentPlan.mode === "EMI" ? `EMI ${r.index + 1} / ${r.customer.paymentPlan.months}` : "Balance payment" },
    { key: "amount", label: "Amount due", render: r => <strong>{amount(r.amount)}</strong> },
    { key: "dueDate", label: "Due date", render: r => date(r.dueDate) },
    { key: "status", label: "Status", render: r => <Badge value={r.status} /> },
    { key: "actions", label: "Actions", render: r => <div className="row-actions">{!r.paidAt && <Button variant="secondary" onClick={() => setSelected(r)}>Remind</Button>}<Button variant="secondary" onClick={() => { setConfirm(r); setError(""); }}>{r.paidAt ? "Undo payment" : "Mark paid"}</Button></div> },
  ];
  return <div className="page-enter">
    <PageHeading title="Payment Reminders" subtitle="Track project balances and monthly EMI payments." action="Add Customer" onAction={() => setEditing({})} />
    <div className="invoice-summary">{["Overdue", "Due soon", "Upcoming"].map(status => <div key={status}><Badge value={status} /><strong>{amount(all.filter(r => r.status === status).reduce((sum, r) => sum + r.amount, 0))}</strong><span>{all.filter(r => r.status === status).length} payments</span></div>)}</div>
    <p>Red: overdue · Yellow: due today or within 7 days · Green: more than 7 days away.</p>
    <section className="panel table-panel">
      <div className="toolbar"><Tabs items={["Unpaid", "Overdue", "Due soon", "Upcoming", "Paid"]} value={tab} onChange={setTab} /><SearchInput value={search} onChange={setSearch} placeholder="Search customers…" /></div>
      <DataTable columns={columns} rows={rows} noun="payments" />
    </section>
    <p>To add or review a payment plan for an existing customer, open their record in Customers. Reminders are sent manually; recorded payments do not change invoices.</p>
    {editing && <RecordModal entity="customers" record={editing} onClose={() => setEditing(null)} />}
    {selected && <Modal title="Payment reminder" onClose={() => setSelected(null)}>
      <div className="form-grid"><label className="field full">Reminder message<textarea rows={8} readOnly value={message} /></label>
      <p className="field full">Copy this message or open an email draft, then review and send it yourself.</p></div>
      <footer><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(message); notify("Reminder copied"); } catch { notify("Select the reminder text and copy it manually."); } }}>Copy reminder</Button>{selected.customer.email && <a className="button" href={`mailto:${encodeURIComponent(selected.customer.email)}?subject=${encodeURIComponent("Payment reminder — BNB Core")}&body=${encodeURIComponent(message)}`}>Open email draft</a>}</footer>
    </Modal>}
    {confirm && <Modal title={confirm.paidAt ? "Undo recorded payment?" : "Record payment received?"} onClose={() => setConfirm(null)}>{close => <>
      <div className="confirm-copy"><p>{confirm.customer.name} · {amount(confirm.amount)} · Due {date(confirm.dueDate)}</p>
      <p>{confirm.paidAt ? `Recorded paid on ${date(confirm.paidAt)}. This will return the payment to the unpaid list.` : "Confirm that you have received the full amount for this payment."}</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer><Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} onClick={() => changePayment(close)}>{busy ? "Saving…" : confirm.paidAt ? "Undo payment" : "Confirm payment"}</Button></footer>
    </>}</Modal>}
  </div>;
}
