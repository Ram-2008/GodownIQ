import { describe, expect, it } from "vitest";
import { createSupplierIncidentSchema } from "../supplierIncidents";
const input = {
  id: "11111111-1111-4111-8111-111111111111", supplier_id: "22222222-2222-4222-8222-222222222222",
  incident_date: "2026-09-24", incident_type: "damage", description: "Ten bags were damaged on arrival.",
};
describe("supplier incident validation", () => {
  it("accepts an unresolved incident", () => expect(createSupplierIncidentSchema.safeParse(input).success).toBe(true));
  it("rejects impossible calendar dates", () => expect(createSupplierIncidentSchema.safeParse({ ...input, incident_date: "2026-02-30" }).success).toBe(false));
  it("requires an explicit resolution date", () => expect(createSupplierIncidentSchema.safeParse({ ...input, resolution: "Credit note" }).success).toBe(false));
  it("rejects a resolution before the incident", () => expect(createSupplierIncidentSchema.safeParse({ ...input, resolution: "Credit note", resolved_date: "2026-09-23" }).success).toBe(false));
  it("rejects client-supplied memory status", () => expect(createSupplierIncidentSchema.safeParse({ ...input, memory_status: "synced" }).success).toBe(false));
});
