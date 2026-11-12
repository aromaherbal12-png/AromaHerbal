import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";

export function PageHeader({ eyebrow = "AROMA HERBAL · PLANT 01", title, subtitle, action, onAction, icon: Icon }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <button className="primary-button" onClick={onAction}>{Icon ? <Icon size={16} /> : <Plus size={16} />}{action}</button>}
    </div>
  );
}

export function StatusBadge({ children }) {
  const style = String(children).toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
  return <span className={`status-badge status-${style}`}>{children}</span>;
}

export function SearchFilter({ value, onChange, placeholder, children }) {
  return <div className="table-toolbar"><label className="table-search"><Search size={16} /><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>{children}</div>;
}

export function RecordTable({ columns, rows, noun = "records", empty = "No records match this view." }) {
  const [page, setPage] = useState(1);
  const perPage = 6;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const shown = rows.slice((currentPage - 1) * perPage, currentPage * perPage);
  useEffect(() => setPage(1), [rows.length]);

  return (
    <>
      <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{shown.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody>
      </table>{!rows.length && <div className="table-empty"><span>⌕</span><strong>{empty}</strong><small>Try changing your search or filters.</small></div>}</div>
      {!!rows.length && <div className="table-pagination"><span>Showing <strong>{(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, rows.length)}</strong> of {rows.length} {noun}</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /></button><span>{currentPage} / {pageCount}</span><button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} /></button></div></div>}
    </>
  );
}

export function PanelHeading({ title, subtitle, action, onAction }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="subtle-link" onClick={onAction}>{action} <span>↗</span></button>}</div>;
}

/** Small demo form. Saving updates browser-local demo data only. */
export function NewRecordDialog({ title, fields, onClose, onSave, submitLabel = "Save record" }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue || ""])));
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.querySelector("input, select, button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);
  const save = (event) => {
    event.preventDefault();
    onSave(values);
    onClose();
  };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="record-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header><div><div className="eyebrow">DEMO WORKSPACE</div><h2 id={titleId}>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></header>
      <form onSubmit={save}><div className="record-form-grid">{fields.map((field) => <label key={field.key} className={field.full ? "field-full" : ""}>{field.label}{field.options ? <select required={field.required !== false} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Select…</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={field.required !== false} type={field.type || "text"} min={field.type === "number" ? 0 : undefined} value={values[field.key]} placeholder={field.placeholder || "Enter value"} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} />}</label>)}</div>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} />{submitLabel}</button></footer>
      </form>
    </section>
  </div>;
}

export function Trend({ direction = "up", children }) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return <span className={`trend trend-${direction}`}><Icon size={12} /> {children}</span>;
}
