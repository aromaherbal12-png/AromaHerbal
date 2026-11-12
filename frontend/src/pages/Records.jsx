import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import {
  PageHeading,
  SearchInput,
  Badge,
  DataTable,
  RowActions,
  ConfirmDelete,
} from "../components/ui";
import { RecordModal } from "../components/RecordForm";
import { dateLabel } from "../utils/format";
const config = {
  leads: {
    title: "Leads",
    subtitle: "Manage and track your leads.",
    singular: "Lead",
  },
  customers: {
    title: "Customers",
    subtitle: "Manage customer records.",
    singular: "Customer",
  },
  contacts: {
    title: "Contacts",
    subtitle: "Manage business contacts.",
    singular: "Contact",
  },
};
export default function Records({ entity }) {
  const { data, remove } = useCRM();
  const navigate = useNavigate();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("All"),
    [source, setSource] = useState("All"),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const cfg = config[entity];
  const edit = (r) =>
    entity === "leads"
      ? navigate(r ? `/leads/${r.id}/edit` : "/leads/new")
      : setEditing(r || {});
  const rows = data[entity].filter(
    (r) =>
      (status === "All" || r.status === status) &&
      (source === "All" || r.source === source) &&
      [r.name, r.company, r.email, r.phone, r.role]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const columns = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <button className="table-name" onClick={() => edit(r)}>
          {entity === "customers" ? (
            <Building2 size={17} />
          ) : (
            <span className="table-initial">{r.name[0]}</span>
          )}
          {r.name}
        </button>
      ),
    },
    { key: "company", label: "Company" },
    ...(entity === "leads"
      ? [
          { key: "source", label: "Source" },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge value={r.status} />,
          },
          {
            key: "date",
            label: "Date",
            render: (r) => dateLabel(r.date, data.settings.dateFormat),
          },
        ]
      : [
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          ...(entity === "contacts"
            ? [{ key: "role", label: "Role" }]
            : [
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <Badge value={r.status} />,
                },
              ]),
        ]),
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <RowActions onEdit={() => edit(r)} onDelete={() => setDeleting(r)} />
      ),
    },
  ];
  return (
    <div className="page-enter">
      <PageHeading
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={`Add ${cfg.singular}`}
        onAction={() => edit()}
      />
      <section className="panel table-panel">
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${entity}…`}
          />
          {entity === "leads" && (
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="All">All sources</option>
              {data.settings.sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {entity !== "contacts" && (
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="All">
                All {entity === "customers" ? "customers" : "statuses"}
              </option>
              {(entity === "leads"
                ? data.settings.leadStatuses
                : ["Active", "Inactive"]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
        <DataTable columns={columns} rows={rows} noun={entity} />
      </section>
      {editing && (
        <RecordModal
          entity={entity}
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove(entity, deleting.id)}
        />
      )}
    </div>
  );
}
