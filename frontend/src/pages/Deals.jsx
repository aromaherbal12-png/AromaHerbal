import { useState } from "react";
import { Plus, CalendarDays, GripVertical } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  PageHeading,
  SearchInput,
  RowActions,
  ConfirmDelete,
} from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { money, dateLabel } from "../utils/format";
export default function Deals() {
  const { data, save, remove, notify } = useCRM();
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [over, setOver] = useState("");
  const stages = data.settings.dealStages;
  const move = async (r, stage) => {
    try {
      await save("deals", { ...r, stage });
    } catch {}
  };
  return (
    <div className="page-enter">
      <PageHeading
        title="Deals"
        subtitle="Track your sales pipeline."
        action="Add Deal"
        onAction={() => setEditing({})}
      />
      <div className="pipeline-toolbar">
        <div>
          <span className="pipeline-total">
            {money(
              data.deals.reduce((s, d) => s + Number(d.amount), 0),
              data.settings.currency,
            )}
          </span>
          <span className="muted">
            Total pipeline · {data.deals.length} deals
          </span>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search deals…"
        />
      </div>
      <div className="kanban">
        {stages.map((stage, i) => {
          const deals = data.deals.filter(
            (d) =>
              d.stage === stage &&
              `${d.name} ${d.company}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          );
          return (
            <section
              key={stage}
              className={`kanban-column stage-${i % 5} ${over === stage ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => setOver("")}
              onDrop={(e) => {
                e.preventDefault();
                setOver("");
                const deal = data.deals.find(
                  (d) => d.id === e.dataTransfer.getData("text/plain"),
                );
                if (deal) move(deal, stage);
              }}
            >
              <header>
                <h2>
                  {stage}
                  <span>{deals.length}</span>
                </h2>
                <small>
                  {money(
                    deals.reduce((s, d) => s + Number(d.amount), 0),
                    data.settings.currency,
                  )}
                </small>
              </header>
              <div className="deal-stack">
                {deals.map((d) => (
                  <article
                    className="deal-card"
                    key={d.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", d.id)
                    }
                  >
                    <div className="deal-card-top">
                      <span className="deal-tag">OPPORTUNITY</span>
                      <GripVertical size={14} />
                    </div>
                    <button
                      className="deal-title"
                      onClick={() => setEditing(d)}
                    >
                      {d.name}
                    </button>
                    <p>{d.company}</p>
                    <strong>{money(d.amount, data.settings.currency)}</strong>
                    <div className="deal-date">
                      <CalendarDays size={12} />
                      {dateLabel(d.date, data.settings.dateFormat)}
                    </div>
                    <div className="deal-card-footer">
                      <select
                        aria-label={`Stage for ${d.name}`}
                        value={d.stage}
                        onChange={(e) => move(d, e.target.value)}
                      >
                        {stages.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <RowActions
                        onEdit={() => setEditing(d)}
                        onDelete={() => setDeleting(d)}
                      />
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="add-deal"
                onClick={() => setEditing({ stage })}
              >
                <Plus size={15} />
                Add deal
              </button>
            </section>
          );
        })}
      </div>
      <p className="board-hint">
        Drag a deal between stages, or choose a stage from its menu.
      </p>
      {editing && (
        <RecordModal
          entity="deals"
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("deals", deleting.id)}
        />
      )}
    </div>
  );
}
