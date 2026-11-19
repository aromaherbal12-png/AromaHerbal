import { Search } from "lucide-react";

const ALL_ROLES = [
  { value: "", label: "All roles" },
  { value: "Administrator", label: "Administrator" },
  { value: "Manager", label: "Manager" },
  { value: "Production-Incharge", label: "Production In-charge" },
  { value: "Store-Incharge", label: "Store In-charge" },
  { value: "Quality-Incharge", label: "Quality In-charge" },
];

export function SearchAndFilter({
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  accountCount,
}) {
  return (
    <div className="search-filter-toolbar">
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-controls">
        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className="role-filter"
        >
          {ALL_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <div className="account-count">
          {accountCount} {accountCount === 1 ? "account" : "accounts"}
        </div>
      </div>
    </div>
  );
}
