import { useMemo, useState } from "react";
import { Check, KeyRound, LockKeyhole, Shield, UserPlus, Users } from "lucide-react";
import { useFactory } from "../context/FactoryContext";
import { NewRecordDialog, PageHeader, RecordTable, SearchFilter, StatusBadge } from "../components/factoryUI";
import "../styles/pages/team.css";

const memberFields = [
  { key: "name", label: "Team member name", full: true },
  { key: "role", label: "Role", options: ["Manager", "Production in-charge", "Store in-charge", "Operator", "Quality in-charge"] },
  { key: "module", label: "Module access", options: ["Dashboard · Reports", "Inventory · Purchasing", "Production", "Quality · Inventory", "Production · Quality"] },
];

const permissionRows = [
  ["Dashboard", [1, 1, 1, 1, 1, 1]],
  ["Inventory", [1, 1, 0, 1, 0, 1]],
  ["Production", [1, 1, 1, 0, 1, 0]],
  ["Quality entry", [1, 1, 0, 0, 0, 1]],
  ["Reports", [1, 1, 1, 0, 0, 1]],
  ["User management", [1, 0, 0, 0, 0, 0]],
];
const roles = ["Admin", "Manager", "Prod. lead", "Store lead", "Operator", "QC lead"];

export default function Team() {
  const { data, addRecord, updateRecord } = useFactory();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const members = useMemo(() => data.team.filter((member) => `${member.id} ${member.name} ${member.role} ${member.module}`.toLowerCase().includes(query.toLowerCase())), [data.team, query]);
  const activeMembers = data.team.filter((member) => member.status === "Active").length;

  const columns = [
    { key: "name", label: "Team member", render: (member) => <div className="team-person"><span>{member.initials || member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{member.name}</strong><small>{member.id}</small></span></div> },
    { key: "role", label: "Assigned role", render: (member) => <span className="role-label"><Shield size={13} /> {member.role}</span> },
    { key: "module", label: "Module access" },
    { key: "status", label: "Account status", render: (member) => <StatusBadge>{member.status}</StatusBadge> },
    { key: "actions", label: "Demo control", render: (member) => <button className={`member-toggle ${member.status === "Active" ? "member-enabled" : ""}`} onClick={() => updateRecord("team", member.id, { status: member.status === "Active" ? "Paused" : "Active" })}>{member.status === "Active" ? "Pause access" : "Restore access"}</button> },
  ];

  return <div className="page-enter team-page">
    <PageHeader title="Team & access" subtitle="Review team roles and preview role-based module access." action="Add team member" onAction={() => setAdding(true)} icon={UserPlus} />
    <section className="summary-strip">
      <div className="summary-chip"><span>Team members</span><strong>{data.team.length}</strong></div>
      <div className="summary-chip"><span>Active accounts</span><strong>{activeMembers}</strong></div>
      <div className="summary-chip"><span>Available roles</span><strong>6</strong></div>
      <div className="summary-chip"><span>Access model</span><strong>Role-based</strong></div>
    </section>
    <section className="table-panel team-table-panel">
      <SearchFilter value={query} onChange={setQuery} placeholder="Search team member or role…"><span className="filter-count">{members.length} members</span></SearchFilter>
      <RecordTable columns={columns} rows={members} noun="members" empty="No team members match this view." />
    </section>
    <section className="permissions-panel panel-card">
      <div className="panel-heading"><div><h2>Role permission matrix</h2><p>Example module visibility by role · sample access rules</p></div><span className="permissions-lock"><LockKeyhole size={14} /> RBAC</span></div>
      <div className="permission-scroll"><table className="permission-table"><thead><tr><th>Module</th>{roles.map((role) => <th key={role}>{role}</th>)}</tr></thead><tbody>{permissionRows.map(([label, values]) => <tr key={label}><th>{label}</th>{values.map((allowed, index) => <td key={`${label}-${roles[index]}`}>{allowed ? <span className="permission-yes"><Check size={13} /></span> : <span className="permission-no">—</span>}</td>)}</tr>)}</tbody></table></div>
      <div className="permissions-foot"><KeyRound size={14} /><span>Permission details are a frontend preview. User provisioning and enforcement will be connected by the backend team.</span><Users size={14} /></div>
    </section>
    <div className="team-rbac-hint"><LockKeyhole size={15} /><span><strong>Role-based access control</strong> Give each team member access to the modules they need for their factory responsibilities.</span></div>
    {adding && <NewRecordDialog title="Add team member" fields={memberFields} onClose={() => setAdding(false)} onSave={(member) => addRecord("team", { ...member, status: "Active", initials: member.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() })} submitLabel="Add member" />}
  </div>;
}
