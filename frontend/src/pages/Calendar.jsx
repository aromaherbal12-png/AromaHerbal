import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  PageHeading,
  Tabs,
  Button,
  Modal,
  ConfirmDelete,
  Badge,
  Empty,
} from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { dateKey, dateLabel } from "../utils/format";
export default function Calendar() {
  const { data, remove } = useCRM();
  const [date, setDate] = useState(() => new Date()),
    [view, setView] = useState("Month"),
    [editing, setEditing] = useState(null),
    [selected, setSelected] = useState(null),
    [deleting, setDeleting] = useState(null);
  const step = (direction) =>
    setDate((d) => {
      const n = new Date(d);
      if (view === "Month") {
        n.setDate(1);
        n.setMonth(n.getMonth() + direction);
      } else n.setDate(n.getDate() + direction * (view === "Week" ? 7 : 1));
      return n;
    });
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start =
    view === "Month"
      ? new Date(date.getFullYear(), date.getMonth(), 1 - first.getDay())
      : new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() - date.getDay(),
        );
  const count =
    view === "Month"
      ? Math.ceil(
          (first.getDay() +
            new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) /
            7,
        ) * 7
      : 7;
  const days = Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const eventsFor = (d) =>
    data.events
      .filter((e) => e.date === dateKey(d))
      .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="page-enter">
      <PageHeading
        title="Calendar"
        subtitle="View and manage your schedule."
        action="Add Event"
        onAction={() => setEditing({ date: dateKey(date) })}
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div className="calendar-navigation">
            <button
              className="icon-button"
              aria-label="Previous period"
              onClick={() => step(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Next period"
              onClick={() => step(1)}
            >
              <ChevronRight size={19} />
            </button>
            <h2>
              {view === "Day"
                ? dateLabel(dateKey(date), data.settings.dateFormat)
                : date.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
            </h2>
            <Button variant="secondary" onClick={() => setDate(new Date())}>
              Today
            </Button>
          </div>
          <Tabs
            items={["Month", "Week", "Day"]}
            value={view}
            onChange={setView}
          />
        </div>
        {view !== "Day" ? (
          <div className="calendar-scroll">
            <div
              className={`calendar-grid ${view === "Week" ? "week-view" : ""}`}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
              {days.map((d) => (
                <div
                  key={dateKey(d)}
                  className={`calendar-cell ${d.getMonth() !== date.getMonth() ? "outside" : ""} ${dateKey(d) === dateKey(new Date()) ? "today" : ""}`}
                >
                  <button
                    className="day-number"
                    aria-label={`Add event on ${dateKey(d)}`}
                    onClick={() => setEditing({ date: dateKey(d) })}
                  >
                    {d.getDate()}
                  </button>
                  <div className="cell-events">
                    {eventsFor(d).map((e) => (
                      <button
                        key={e.id}
                        className={`calendar-event badge-${e.type.toLowerCase().replace(/[^a-z]/g, "")}`}
                        onClick={() => setSelected(e)}
                      >
                        <span>{e.name}</span>
                        <small>{e.time}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="day-agenda">
            {eventsFor(date).length ? (
              eventsFor(date).map((e) => (
                <button key={e.id} onClick={() => setSelected(e)}>
                  <span>{e.time}</span>
                  <strong>{e.name}</strong>
                  <Badge value={e.type} />
                </button>
              ))
            ) : (
              <Empty
                message="No events scheduled."
                action={
                  <Button onClick={() => setEditing({ date: dateKey(date) })}>
                    <Plus size={16} />
                    Add an event
                  </Button>
                }
              />
            )}
          </div>
        )}
        <div className="calendar-legend">
          {["Call", "Meeting", "Follow-up", "Deadline"].map((t) => (
            <Badge key={t} value={t} />
          ))}
        </div>
      </section>
      {editing && (
        <RecordModal
          entity="events"
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="event-details">
            <Badge value={selected.type} />
            <p>
              <Clock size={17} />
              {dateLabel(selected.date, data.settings.dateFormat)} ·{" "}
              {selected.time}
            </p>
            <p>{selected.notes || "No additional notes."}</p>
          </div>
          <footer>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleting(selected);
                setSelected(null);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                setEditing(selected);
                setSelected(null);
              }}
            >
              Edit event
            </Button>
          </footer>
        </Modal>
      )}{" "}
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("events", deleting.id)}
        />
      )}
    </div>
  );
}
