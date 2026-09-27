import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createBank: vi.fn(), retain: vi.fn(), env: {
  HINDSIGHT_API_KEY: "test-secret", HINDSIGHT_API_URL: "http://localhost:8888",
} }));
vi.mock("../../config/env", () => ({ env: mocks.env }));
vi.mock("@vectorize-io/hindsight-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@vectorize-io/hindsight-client")>();
  return { ...original, HindsightClient: vi.fn().mockImplementation(() => ({ createBank: mocks.createBank, retain: mocks.retain })) };
});
import { HindsightError } from "@vectorize-io/hindsight-client";
import { incidentMemoryText, retainSupplierIncident } from "../supplierMemoryService";
import type { SupplierIncident } from "../supplierIncidentService";

const incident: SupplierIncident = {
  id: "11111111-1111-4111-8111-111111111111", supplier_id: "22222222-2222-4222-8222-222222222222",
  supplier_name: "Demo Traders", incident_date: "2026-09-24", incident_type: "damage",
  description: "Ten rice bags were damaged.", resolution: "Credit note issued.", resolved_date: "2026-09-27",
  is_demo: true, created_by: "owner", created_at: "2026-09-27T09:00:00Z",
  memory_status: "pending", memory_synced_at: null, memory_bank_id: null,
};
beforeEach(() => {
  vi.clearAllMocks(); mocks.env.HINDSIGHT_API_KEY = "test-secret";
  mocks.createBank.mockResolvedValue({}); mocks.retain.mockResolvedValue({ success: true });
});
describe("supplier memory sync", () => {
  it("uses explicit event dates and a stable document ID when retried", async () => {
    await retainSupplierIncident("demo-bank", incident);
    await retainSupplierIncident("demo-bank", incident);
    for (const call of mocks.retain.mock.calls) {
      expect(call[2]).toMatchObject({ documentId: `supplier-incident-${incident.id}`, timestamp: "2026-09-24T12:00:00+05:30", async: false });
      expect(call[1]).toContain("Reported resolution on 2026-09-27");
      expect(call[1]).toContain("SYNTHETIC DEMO DATA");
    }
  });
  it("does not invent a resolution for an unresolved incident", () => {
    const text = incidentMemoryText({ ...incident, resolution: null, resolved_date: null });
    expect(text).toContain("No resolution has been recorded");
    expect(text).not.toContain("Reported resolution on");
  });
  it("keeps configuration failures retryable without making requests", async () => {
    mocks.env.HINDSIGHT_API_KEY = "";
    expect(await retainSupplierIncident("bank", incident)).toMatchObject({ ok: false });
    expect(mocks.createBank).not.toHaveBeenCalled();
  });
  it("returns a safe warning rather than a key or SDK request details", async () => {
    mocks.retain.mockRejectedValue(new HindsightError("Bearer test-secret", 401));
    const result = await retainSupplierIncident("bank", incident);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain("test-secret");
    expect(JSON.stringify(result)).toContain("rejected access");
  });
  it("does not report memory success when the service times out", async () => {
    mocks.retain.mockRejectedValue(new Error("TimeoutError"));
    expect(await retainSupplierIncident("bank", incident)).toMatchObject({ ok: false });
  });
  it("does not mark a merely queued or unsuccessful operation as remembered", async () => {
    mocks.retain.mockResolvedValueOnce({ success: true, async: true });
    expect(await retainSupplierIncident("bank", incident)).toMatchObject({ ok: false });
    mocks.retain.mockResolvedValueOnce({ success: false, async: false });
    expect(await retainSupplierIncident("bank", incident)).toMatchObject({ ok: false });
  });
});
