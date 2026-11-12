import { randomUUID } from "node:crypto";

/**
 * Generates a unique batch number in the format BMR-YYYYMMDD-XXXXXXXX.
 * Stateless — relies on UUID entropy for uniqueness rather than a counter.
 */
export async function generateBatchNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `BATCH-${date}-${suffix}`;
}
