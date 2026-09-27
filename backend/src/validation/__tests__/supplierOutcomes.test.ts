import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupplierOutcomeSchema, listSupplierOutcomesSchema } from "../supplierOutcomes";
const input = {
  id: "33333333-3333-4333-8333-333333333333", supplier_id: "22222222-2222-4222-8222-222222222222",
  related_incident_id: "11111111-1111-4111-8111-111111111111", action_taken: "Requested dry packaging", outcome_status: "worked",
  result_details: "All 100 bags arrived without moisture damage.", outcome_date: "2026-09-27", is_demo: true,
};
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-27T10:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("outcome validation", () => {
  it("accepts completed outcomes and partial/failed observations", () => {
    for (const status of ["worked", "partly_worked", "did_not_work"]) expect(createSupplierOutcomeSchema.safeParse({ ...input, outcome_status: status }).success).toBe(true);
  });
  it("rejects future and impossible dates", () => {
    for (const date of ["2026-09-30", "2026-02-30"]) expect(createSupplierOutcomeSchema.safeParse({ ...input, outcome_date: date }).success).toBe(false);
  });
  it("requires an action and observed details rather than a thumbs-up alone", () => {
    expect(createSupplierOutcomeSchema.safeParse({ ...input, result_details: "good" }).success).toBe(false);
  });
  it("does not accept forged sync state", () => {
    expect(createSupplierOutcomeSchema.safeParse({ ...input, memory_status: "synced" }).success).toBe(false);
  });
  it("parses the string false as real mode, not truthy demo mode", () => {
    expect(listSupplierOutcomesSchema.parse({ supplier_id: input.supplier_id, demo_mode: "false" }).demo_mode).toBe(false);
  });
});
