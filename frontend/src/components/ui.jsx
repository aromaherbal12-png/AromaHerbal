import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Plus,
  Inbox,
  Trash2,
  Pencil,
} from "lucide-react";
export function Button({ children, variant = "", className = "", ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PageHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">WORKSPACE / {title.toUpperCase()}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && (
        <Button onClick={onAction}>
          <Plus size={17} />
          {action}
        </Button>
      )}
    </div>
  );
}
export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <label className="search-input">
      <Search size={17} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Badge({ value }) {
  return (
    <span
      className={`badge badge-${String(value)
        .toLowerCase()
        .replace(/[^a-z]/g, "")}`}
    >
      {value}
    </span>
  );
}
export function Empty({ message = "No records found.", action }) {
  return (
    <div className="empty">
      <Inbox size={34} />
      <h3>{message}</h3>
      <p>Try a different search or add a new record.</p>
      {action}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const dialog = useRef();
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 160);
  };
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""} ${closing ? "closing" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="modal-inner">
        <header>
          <div>
            <div className="eyebrow">BNB CORE</div>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {typeof children === "function" ? children(close) : children}
      </div>
    </dialog>
  );
}
export function ConfirmDelete({ name, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Delete record?" onClose={onClose}>
      {(close) => (
        <>
          <p className="confirm-copy">
            Delete <strong>{name}</strong>? This cannot be undone.
          </p>
          {error && <p role="alert">{error}</p>}
          <footer>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  close();
                } catch {
                  setError("Unable to delete. Please try again.");
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete record"}
            </Button>
          </footer>
        </>
      )}
    </Modal>
  );
}
export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="icon-button" aria-label="Edit record" onClick={onEdit}>
        <Pencil size={15} />
      </button>
      <button
        className="icon-button delete-button"
        aria-label="Delete record"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
export function DataTable({ columns, rows, pageSize = 5, noun = "records" }) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(page, total);
  const start = (safe - 1) * pageSize;
  useEffect(() => setPage(1), [rows.length]);
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(start, start + pageSize).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <Empty />
      ) : (
        <div className="pagination">
          <span>
            Showing{" "}
            <strong>
              {start + 1}–{Math.min(start + pageSize, rows.length)}
            </strong>{" "}
            of {rows.length} {noun}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={safe === 1}
              onClick={() => setPage(safe - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: total }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - safe) < 2 || n === 1 || n === total)
              .map((n, i, a) => (
                <span key={n}>
                  {i > 0 && n - a[i - 1] > 1 && "…"}
                  <button
                    className={safe === n ? "active" : ""}
                    onClick={() => setPage(n)}
                    aria-label={`Page ${n}`}
                    aria-current={safe === n ? "page" : undefined}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              aria-label="Next page"
              disabled={safe === total}
              onClick={() => setPage(safe + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export function Tabs({ items, value, onChange }) {
  return (
    <div className="tabs" role="group" aria-label="Filter view">
      {items.map((item) => (
        <button
          key={item}
          className={value === item ? "active" : ""}
          onClick={() => onChange(item)}
          aria-pressed={value === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
