import test from "node:test";
import assert from "node:assert/strict";
import { scheduleFor, validatePlan, urgency, paymentRows } from "./payments.js";
const plan = { cost: 100, advance: 0, mode: "EMI", months: 3, dueDate: "2026-01-31", paid: {} };
test("EMI preserves the original day after short months and rounds exactly", () => {
  const rows = scheduleFor(plan);
  assert.deepEqual(rows.map(r => r.dueDate), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.deepEqual(rows.map(r => r.amount), [33.34, 33.33, 33.33]);
  assert.equal(rows.reduce((sum, r) => sum + Math.round(r.amount * 100), 0), 10000);
  assert.equal(scheduleFor({ ...plan, dueDate: "2028-01-31" })[1].dueDate, "2028-02-29");
});
test("advance, single balance and fully paid plans", () => {
  assert.equal(scheduleFor({ ...plan, advance: 25, mode: "Single payment" })[0].amount, 75);
  assert.deepEqual(scheduleFor({ ...plan, advance: 100, dueDate: "" }), []);
  assert.deepEqual(scheduleFor(undefined), []);
});
test("reject invalid amounts, impossible dates and EMI terms", () => {
  for (const patch of [{ cost: "" }, { cost: Infinity }, { advance: -1 }, { advance: 101 }, { months: 1.5 }, { months: 0 }, { months: 361 }, { dueDate: "2026-02-30" }, { dueDate: "" }]) assert.ok(validatePlan({ ...plan, ...patch }), JSON.stringify(patch));
});
test("urgency boundaries and paid installments", () => {
  assert.equal(urgency("2026-10-08", "2026-10-09"), "Overdue");
  assert.equal(urgency("2026-10-09", "2026-10-09"), "Due soon");
  assert.equal(urgency("2026-10-16", "2026-10-09"), "Due soon");
  assert.equal(urgency("2026-10-17", "2026-10-09"), "Upcoming");
  const rows = paymentRows([{ id: "legacy" }, { id: "c1", paymentPlan: { ...plan, paid: { 0: "2026-01-31" } } }], "2026-02-01");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].status, "Paid");
  assert.equal(rows[1].status, "Upcoming");
});
