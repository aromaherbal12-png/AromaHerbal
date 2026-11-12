import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Check } from "lucide-react";
import { useCRM } from "../context/CRMContext";
import { RecordForm } from "../components/RecordForm";
export default function LeadForm() {
  const { data } = useCRM();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = data.leads.find((l) => l.id === id);
  if (id && !record)
    return (
      <div className="empty">
        <h1>Lead not found</h1>
        <Link to="/leads">Back to leads</Link>
      </div>
    );
  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / LEADS</div>
          <h1>{id ? "Edit lead" : "Add new lead"}</h1>
          <p>
            {id
              ? "Update lead information."
              : "Enter the details for a new lead."}
          </p>
        </div>
        <Link className="button secondary" to="/leads">
          <ArrowLeft size={16} />
          Back to leads
        </Link>
      </div>
      <div className="lead-form-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>Lead details</h2>
            <span className="muted">* Required fields</span>
          </div>
          <RecordForm
            key={id || "new"}
            entity="leads"
            record={record}
            onDone={() => navigate("/leads")}
            onCancel={() => navigate("/leads")}
          />
        </section>
        <aside className="lead-info">
          <div className="info-icon">
            <FileText size={44} strokeWidth={1} />
          </div>
          <h2>Lead information</h2>
          <p>
            Add contact information, select a source and status, and record any relevant notes.
          </p>
          <ul>
            <li>
              <Check size={15} />
              Capture contact details
            </li>
            <li>
              <Check size={15} />
              Track source and status
            </li>
            <li>
              <Check size={15} />
              Add context with notes
            </li>
          </ul>
          <div className="info-caption">BNB CORE CRM</div>
        </aside>
      </div>
    </div>
  );
}
