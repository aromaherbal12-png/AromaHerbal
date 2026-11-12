export function fieldsFor(entity, settings) {
  const text = (name, label, extra = {}) => ({ name, label, ...extra });
  const select = (name, label, options) => ({
    name,
    label,
    type: "select",
    options,
    required: true,
  });
  const common = [
    text("name", "Full name", { required: true }),
    text("company", "Company name", { required: true }),
    text("email", "Email", { type: "email" }),
    text("phone", "Phone", { type: "tel" }),
  ];
  return {
    leads: [
      ...common,
      select("source", "Source", settings.sources),
      select("status", "Status", settings.leadStatuses),
      text("notes", "Notes", { type: "textarea", full: true }),
    ],
    customers: [
      text("name", "Customer name", { required: true }),
      text("company", "Company name", { required: true }),
      text("email", "Email", { type: "email", required: true }),
      text("phone", "Phone", { type: "tel" }),
      select("status", "Status", ["Active", "Inactive"]),
    ],
    contacts: [...common, text("role", "Role / job title", { full: true })],
    deals: [
      text("name", "Deal name", { required: true }),
      text("company", "Company", { required: true }),
      text("amount", "Amount", { type: "number", min: 0, required: true }),
      select("stage", "Pipeline stage", settings.dealStages),
      text("date", "Expected close date", {
        type: "date",
        required: true,
        full: true,
      }),
    ],
    tasks: [
      text("name", "Task name", { required: true, full: true }),
      select("relatedTo", "Related to", ["Lead", "Customer", "Deal"]),
      select("priority", "Priority", ["High", "Medium", "Low"]),
      text("date", "Due date", { type: "date", required: true }),
      text("time", "Time", { type: "time", required: true }),
    ],
    events: [
      text("name", "Event name", { required: true, full: true }),
      text("date", "Date", { type: "date", required: true }),
      text("time", "Time", { type: "time", required: true }),
      select("type", "Event type", [
        "Call",
        "Meeting",
        "Follow-up",
        "Deadline",
      ]),
      text("notes", "Notes", { type: "textarea", full: true }),
    ],
    invoices: [
      text("number", "Invoice number", { required: true }),
      text("customer", "Customer", { required: true }),
      text("amount", "Amount", { type: "number", min: 0, required: true }),
      select("status", "Status", ["Paid", "Pending", "Overdue"]),
      text("date", "Invoice date", { type: "date", required: true }),
      text("dueDate", "Due date", { type: "date", required: true }),
      text("description", "Description", { type: "textarea", full: true }),
    ],
  }[entity];
}
