import { paymentMoney, scheduleFor, validatePlan } from "../utils/payments";

export const blankPlan = () => ({ cost: "", advance: "0", mode: "Single payment", dueDate: "", months: "", paid: {} });
export default function PaymentFields({ plan, onChange, currency }) {
  const locked = Object.values(plan.paid || {}).some(Boolean);
  const set = (key, value) => onChange({ ...plan, [key]: value });
  const balance = Number(plan.cost) - Number(plan.advance);
  const schedule = scheduleFor(plan);
  return <div className="form-grid">
    <h3 className="field full">Project payments</h3>
    {locked && <p className="field full">Payment terms are locked while payments are recorded. Undo recorded payments in Payment Reminders before changing the schedule.</p>}

      <label className="field">Project cost *<input type="number" min="0.01" max="10000000000" step="0.01" required disabled={locked} value={plan.cost} onChange={e => set("cost", e.target.value)} /></label>
      <label className="field">Advance paid *<input type="number" min="0" step="0.01" required disabled={locked} value={plan.advance} onChange={e => set("advance", e.target.value)} /></label>
      <label className="field">Payment option *<select disabled={locked} value={plan.mode} onChange={e => set("mode", e.target.value)}><option>Single payment</option><option>EMI</option></select></label>
      {balance > 0 && <label className="field">{plan.mode === "EMI" ? "First EMI due date" : "Next due date"} *<input type="date" required disabled={locked} value={plan.dueDate} onChange={e => set("dueDate", e.target.value)} /></label>}
      {balance > 0 && plan.mode === "EMI" && <label className="field">Number of EMI months *<input type="number" min="1" max="360" step="1" required disabled={locked} value={plan.months} onChange={e => set("months", e.target.value)} /></label>}

    {!validatePlan(plan) && <p className="field full">Balance after advance: <strong>{paymentMoney(balance, currency)}</strong>{schedule.length > 0 && plan.mode === "EMI" && <> · {schedule.length} monthly payments, starting at {paymentMoney(schedule[0].amount, currency)}. Short months use their last day; rounding is included in the schedule.</>}</p>}
  </div>;
}

