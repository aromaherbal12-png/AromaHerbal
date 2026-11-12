import { useState } from "react";
import { useCRM } from "../context/CRMContext";
import { fieldsFor } from "../data/forms";
import { Button, Modal } from "./ui";
import { dateKey } from "../utils/format";
import PaymentFields, { blankPlan } from "./PaymentFields";
import { validatePlan } from "../utils/payments";
export function RecordForm({ entity, record = {}, onDone, onCancel }) {
  const { data, save } = useCRM();
  const fields = fieldsFor(entity, data.settings);
  const [values, setValues] = useState(() =>
    Object.fromEntries([
      ...fields.map((f) => [
        f.name,
        record[f.name] ??
          (f.type === "select"
            ? f.options[0]
            : f.type === "date"
              ? dateKey(new Date())
              : ""),
      ]),
      ...Object.entries(record),
    ]),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [plan, setPlan] = useState(() => record.paymentPlan || (entity === "customers" && !record.id ? blankPlan() : null));
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    const cleaned = { ...values };
    for (const f of fields) {
      if (typeof cleaned[f.name] === "string")
        cleaned[f.name] = cleaned[f.name].trim();
      if (f.required && !String(cleaned[f.name] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
      if (f.type === "number") cleaned[f.name] = Number(cleaned[f.name]);
    }
    if (entity === "invoices") {
      if (cleaned.dueDate < cleaned.date) {
        setError("Due date must be on or after the invoice date.");
        return;
      }
      if (
        data.invoices.some(
          (i) =>
            i.id !== record.id &&
            i.number.toLowerCase() === cleaned.number.toLowerCase(),
        )
      ) {
        setError("This invoice number is already in use.");
        return;
      }
    }
    setBusy(true);
    if (entity === "customers") {
      const problem = validatePlan(plan);
      if (problem) { setError(problem); setBusy(false); return; }
      if (plan) cleaned.paymentPlan = { ...plan, cost: Number(plan.cost), advance: Number(plan.advance), months: plan.mode === "EMI" ? Number(plan.months) : 1 };
    }
    try {
      const item = await save(entity, {
        ...cleaned,
        ...(entity === "leads" && !record.id
          ? { date: dateKey(new Date()) }
          : {}),
        ...(entity === "tasks" ? { completed: record.completed ?? false } : {}),
      });
      onDone(item);
    } catch {
      setError("Could not save this record. Please try again.");
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => (
          <label className={`field ${f.full ? "full" : ""}`} key={f.name}>
            {f.label}
            {f.required ? " *" : ""}
            {f.type === "select" ? (
              <select
                name={f.name}
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
                required={f.required}
              >
                {[
                  ...new Set([
                    ...f.options,
                    ...(values[f.name] ? [values[f.name]] : []),
                  ]),
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                name={f.name}
                placeholder="Add notes…"
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              />
            ) : (
              <input
                name={f.name}
                type={f.type || "text"}
                placeholder={`Enter ${f.label.toLowerCase()}`}
                min={f.min}
                step={f.type === "number" ? "0.01" : undefined}
                maxLength={f.type === "number" ? undefined : 250}
                required={f.required}
                value={values[f.name]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                }
              />
            )}
          </label>
        ))}
      </div>
      {entity === "customers" && (plan ? <PaymentFields plan={plan} onChange={setPlan} currency={data.settings.currency} /> : <Button type="button" variant="secondary" onClick={() => setPlan(blankPlan())}>Set up project payments</Button>)}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : record.id
              ? "Save changes"
              : `Save ${entity === "leads" ? "lead" : entity === "customers" ? "customer" : entity === "contacts" ? "contact" : entity === "deals" ? "deal" : entity === "tasks" ? "task" : entity === "events" ? "event" : "invoice"}`}
        </Button>
      </div>
    </form>
  );
}
export function RecordModal({ entity, record, onClose }) {
  const names = {
    customers: "customer",
    contacts: "contact",
    deals: "deal",
    tasks: "task",
    events: "event",
    invoices: "invoice",
  };
  return (
    <Modal
      title={`${record?.id ? "Edit" : "Add"} ${names[entity]}`}
      onClose={onClose}
    >
      {(close) => (
        <RecordForm
          entity={entity}
          record={record}
          onDone={close}
          onCancel={close}
        />
      )}
    </Modal>
  );
}
