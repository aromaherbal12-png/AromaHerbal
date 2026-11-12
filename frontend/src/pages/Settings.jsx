import { useState } from "react";
import {
  Settings as Gear,
  UserRound,
  BriefcaseBusiness,
  Globe,
  Mail,
  Plus,
  X,
} from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { PageHeading, Button } from "../components/ui";
const sections = [
  ["General", Gear],
  ["Lead statuses", UserRound],
  ["Deal stages", BriefcaseBusiness],
  ["Sources", Globe],
  ["Email templates", Mail],
];
export default function Settings() {
  const { data, saveSettings } = useCRM();
  const [section, setSection] = useState("General"),
    [draft, setDraft] = useState(() => structuredClone(data.settings)),
    [entry, setEntry] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = {
    "Lead statuses": "leadStatuses",
    "Deal stages": "dealStages",
    Sources: "sources",
  }[section];
  const update = (name, value) => setDraft((d) => ({ ...d, [name]: value }));
  const add = () => {
    const value = entry.trim();
    if (!value) return;
    if (draft[key].some((s) => s.toLowerCase() === value.toLowerCase())) {
      setError("This option already exists.");
      return;
    }
    update(key, [...draft[key], value]);
    setEntry("");
    setError("");
  };
  const removeOption = (value) => {
    const entity =
      key === "leadStatuses"
        ? "leads"
        : key === "dealStages"
          ? "deals"
          : "leads";
    const field =
      key === "leadStatuses"
        ? "status"
        : key === "dealStages"
          ? "stage"
          : "source";
    if (data[entity].some((r) => r[field] === value)) {
      setError(
        "This option is used by existing records. Update those records first.",
      );
      return;
    }
    if (draft[key].length === 1) {
      setError("Keep at least one option.");
      return;
    }
    update(
      key,
      draft[key].filter((s) => s !== value),
    );
    setError("");
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveSettings(draft);
    } catch {
      setError("Unable to save settings. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-enter">
      <PageHeading
        title="CRM Settings"
        subtitle="Configure your CRM preferences."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {sections.map(([name, Icon]) => (
            <button
              key={name}
              className={section === name ? "active" : ""}
              onClick={() => {
                setSection(name);
                setError("");
                setEntry("");
              }}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <h2>{section === "General" ? "General settings" : section}</h2>
            <span className="muted">WORKSPACE PREFERENCES</span>
          </div>
          <form onSubmit={submit}>
            {section === "General" ? (
              <>
                <div className="form-grid">
                  <label className="field">
                    Display currency
                    <select
                      value={draft.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </label>
                  <label className="field">
                    Date format
                    <select
                      value={draft.dateFormat}
                      onChange={(e) => update("dateFormat", e.target.value)}
                    >
                      <option>DD MMM YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </label>
                  <label className="field full">
                    Time zone
                    <select
                      value={draft.timezone}
                      onChange={(e) => update("timezone", e.target.value)}
                    >
                      <option value="Asia/Kolkata">
                        (GMT+5:30) India Standard Time
                      </option>
                      <option value="UTC">(GMT+0:00) UTC</option>
                      <option value="America/New_York">
                        America / New York
                      </option>
                      <option value="Europe/London">Europe / London</option>
                    </select>
                  </label>
                </div>
                <p className="settings-note">
                  Currency changes the display symbol; amounts are not
                  converted. Calendar dates and times are entered in your
                  selected workspace time zone.
                </p>
              </>
            ) : key ? (
              <div className="option-editor">
                <p>
                  Choose the options available when creating or editing records.
                </p>
                <div className="option-list">
                  {draft[key].map((value, i) => (
                    <div key={value}>
                      <span className="option-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{value}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove ${value}`}
                        onClick={() => removeOption(value)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="option-add">
                  <input
                    aria-label="New option"
                    maxLength={40}
                    placeholder="Add a new option…"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={add}>
                    <Plus size={16} />
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <div className="form-grid">
                <label className="field full">
                  Subject
                  <input
                    required
                    value={draft.emailSubject}
                    onChange={(e) => update("emailSubject", e.target.value)}
                  />
                </label>
                <label className="field full">
                  Message
                  <textarea
                    className="email-template"
                    required
                    value={draft.emailBody}
                    onChange={(e) => update("emailBody", e.target.value)}
                  />
                </label>
                <p className="field full muted">
                  Use {"{{name}}"} as a recipient placeholder. Templates are
                  saved here for future email integration.
                </p>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-footer">
              <Button disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
