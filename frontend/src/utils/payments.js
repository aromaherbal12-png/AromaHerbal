export const cents = (value) => Math.round(Number(value) * 100);
export const paymentMoney = (value, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
export function todayInZone(timezone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validatePlan(plan) {
  if (!plan) return "";
  if (plan.cost === "" || !Number.isFinite(Number(plan.cost)) || cents(plan.cost) <= 0 || cents(plan.cost) > 1e12) return "Enter a project cost greater than zero (up to 10 billion).";
  if (plan.advance === "" || !Number.isFinite(Number(plan.advance)) || cents(plan.advance) < 0 || cents(plan.advance) > cents(plan.cost)) return "Advance must be between zero and the project cost.";
  if (!["Single payment", "EMI"].includes(plan.mode)) return "Select a payment option.";
  const balance = cents(plan.cost) - cents(plan.advance);
  if (balance && !validDate(plan.dueDate)) return "Enter a valid next due date.";
  if (balance && plan.mode === "EMI" && (!Number.isInteger(Number(plan.months)) || Number(plan.months) < 1 || Number(plan.months) > 360 || Number(plan.months) > balance)) return "Enter a whole number of EMI months from 1 to 360, with at least 0.01 per payment.";
  return "";
}
export function scheduleFor(plan) {
  if (!plan || validatePlan(plan)) return [];
  const balance = cents(plan.cost) - cents(plan.advance);
  if (!balance) return [];
  const count = plan.mode === "EMI" ? Number(plan.months) : 1;
  const [year, month, day] = plan.dueDate.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return { index, dueDate: date.toISOString().slice(0, 10), amount: (Math.floor(balance / count) + (index < balance % count ? 1 : 0)) / 100, paidAt: plan.paid?.[index] || null };
  });
}
export function urgency(dueDate, today) {
  if (dueDate < today) return "Overdue";
  return (Date.parse(dueDate) - Date.parse(today)) / 86400000 <= 7 ? "Due soon" : "Upcoming";
}
export function paymentRows(customers, today) {
  return customers.flatMap((customer) => scheduleFor(customer.paymentPlan).map((item) => ({ ...item, id: `${customer.id}-${item.index}`, customer, status: item.paidAt ? "Paid" : urgency(item.dueDate, today) }))).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
