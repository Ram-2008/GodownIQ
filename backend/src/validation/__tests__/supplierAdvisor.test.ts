import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supplierAdvisorInputSchema } from "../supplierAdvisor";
import { createSupplierIncidentSchema } from "../supplierIncidents";
import { indiaToday } from "../../utils/indiaDate";
const input = {
  id: "11111111-1111-4111-8111-111111111111", supplier_id: "22222222-2222-4222-8222-222222222222",
  incident_date: "2026-09-27", incident_type: "damage", description: "Ten rice bags were damaged on arrival.",
};
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-27T10:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("advisor request and completed event dates", () => {
  it("uses the India calendar date at the UTC boundary", () => {
    expect(indiaToday(new Date("2026-09-27T19:00:00Z"))).toBe("2026-09-28");
  });
  it("rejects future incident dates, including synthetic records", () => {
    expect(createSupplierIncidentSchema.safeParse({ ...input, incident_date: "2026-09-30", is_demo: true }).success).toBe(false);
  });
  it("rejects a claimed resolution in the future", () => {
    expect(createSupplierIncidentSchema.safeParse({ ...input, resolution: "Credit note issued", resolved_date: "2026-09-30" }).success).toBe(false);
  });
  it("accepts a resolution completed today", () => {
    expect(createSupplierIncidentSchema.safeParse({ ...input, resolution: "Credit note issued", resolved_date: "2026-09-27" }).success).toBe(true);
  });
  it("uses real records by default and refuses bank overrides", () => {
    const request = { supplier_id: input.supplier_id, question: "Should I order 100 rice bags?" };
    expect(supplierAdvisorInputSchema.parse(request).demo_mode).toBe(false);
    expect(supplierAdvisorInputSchema.safeParse({ ...request, bank_id: "another-bank" }).success).toBe(false);
  });
});
