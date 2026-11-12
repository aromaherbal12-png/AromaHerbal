import { useState } from "react";
import { useCRM } from "../context/CRMContext";
import {
  PageHeading,
  SearchInput,
  Tabs,
  DataTable,
  Badge,
  RowActions,
  ConfirmDelete,
} from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { dateLabel } from "../utils/format";
export default function Tasks() {
  const { data, save, remove } = useCRM();
  const [tab, setTab] = useState("All"),
    [search, setSearch] = useState(""),
    [priority, setPriority] = useState("All"),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const rows = data.tasks.filter(
    (t) =>
      (tab === "All" || (tab === "Completed" ? t.completed : !t.completed)) &&
      (priority === "All" || t.priority === priority) &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const columns = [
    {
      key: "completed",
      label: "Done",
      render: (t) => (
        <input
          className="task-checkbox"
          type="checkbox"
          aria-label={`Complete ${t.name}`}
          checked={t.completed}
          onChange={(e) =>
            save("tasks", { ...t, completed: e.target.checked }).catch(() => {})
          }
        />
      ),
    },
    {
      key: "name",
      label: "Task",
      render: (t) => (
        <span className={t.completed ? "completed-text" : ""}>{t.name}</span>
      ),
    },
    { key: "relatedTo", label: "Related to" },
    {
      key: "date",
      label: "Due date",
      render: (t) => (
        <div>
          {dateLabel(t.date, data.settings.dateFormat)}
          <small className="cell-subtext">{t.time}</small>
        </div>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (t) => <Badge value={t.priority} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (t) => (
        <RowActions
          onEdit={() => setEditing(t)}
          onDelete={() => setDeleting(t)}
        />
      ),
    },
  ];
  return (
    <div className="page-enter">
      <PageHeading
        title="Tasks"
        subtitle="Track tasks, priorities, and due dates."
        action="Add Task"
        onAction={() => setEditing({})}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <Tabs
            items={["All", "Pending", "Completed"]}
            value={tab}
            onChange={setTab}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tasks…"
          />
          <select
            aria-label="Filter task priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="All">All priorities</option>
            {["High", "Medium", "Low"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} noun="tasks" />
      </section>
      {editing && (
        <RecordModal
          entity="tasks"
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove("tasks", deleting.id)}
        />
      )}
    </div>
  );
}
