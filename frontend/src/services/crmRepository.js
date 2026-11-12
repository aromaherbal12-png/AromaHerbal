import { seed } from "../data/seed";
const STORAGE_KEY = "bnb-crm-v1";
// Persistence adapter for browser-local CRM data.
export const crmRepository = {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(seed);
    try {
      const saved = JSON.parse(raw);
      if (
        !saved ||
        !Object.keys(seed).every((key) =>
          key === "settings"
            ? saved.settings && typeof saved.settings === "object"
            : Array.isArray(saved[key]),
        )
      )
        throw new Error("Invalid data");
      const demoCustomers = new Map(seed.customers.map((customer) => [customer.id, customer]));
      const customers = saved.customers.map((customer) => {
        const demo = demoCustomers.get(customer.id);
        // Older browser saves contain the original seeded customer records. Add
        // sample plans only when their identity fields still match the seed and
        // they have no plan, so real/edited customer records are left alone.
        const isUnmodifiedDemo = demo &&
          customer.name === demo.name &&
          customer.company === demo.company &&
          customer.email === demo.email &&
          !customer.paymentPlan;
        return isUnmodifiedDemo ? { ...customer, paymentPlan: structuredClone(demo.paymentPlan) } : customer;
      });
      return {
        ...structuredClone(seed),
        ...saved,
        customers,
        settings: { ...seed.settings, ...saved.settings },
      };
    } catch {
      throw new Error(
        "Saved data could not be read. Clear BNB Core site storage to start with demo data.",
      );
    }
  },
  async save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  },
};
