import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const memory = vi.hoisted(() => ({ retain: vi.fn() }));
vi.mock("../../config/env", () => ({ env: { HINDSIGHT_BANK_ID: "godowniq-demo" } }));
vi.mock("../supplierMemoryService", () => ({ retainSupplierIncident: memory.retain }));
import { syncSupplierIncident } from "../supplierIncidentService";

function database(memoryStatus = "pending", updateFails = false) {
  const incident = { id: "incident-1", memory_status: memoryStatus, memory_bank_id: memoryStatus === "synced" ? "godowniq-demo-supplier-incidents" : null };
  const read = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: incident, error: null }) };
  const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue(updateFails ? { data: null, error: {} } : { data: { ...incident, memory_status: "synced" }, error: null }) };
  const from = vi.fn().mockReturnValueOnce(read).mockReturnValue(update);
  return { db: { from } as unknown as SupabaseClient, from, update };
}
beforeEach(() => vi.clearAllMocks());
describe("persisted supplier incident retry", () => {
  it("leaves the database record intact and pending when Hindsight fails", async () => {
    const { db, from, update } = database();
    memory.retain.mockResolvedValue({ ok: false, message: "Retry later" });
    const result = await syncSupplierIncident(db, "incident-1");
    expect(result.incident.memory_status).toBe("pending");
    expect(result.warning).toBe("Retry later");
    expect(from).toHaveBeenCalledTimes(1);
    expect(update.update).not.toHaveBeenCalled();
  });
  it("marks success only after Hindsight accepts the incident", async () => {
    const { db, update } = database();
    memory.retain.mockResolvedValue({ ok: true });
    const result = await syncSupplierIncident(db, "incident-1");
    expect(result.warning).toBeNull();
    expect(result.incident.memory_status).toBe("synced");
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ memory_status: "synced" }));
  });
  it("makes repeat sync of a remembered record a no-op", async () => {
    const { db } = database("synced");
    await syncSupplierIncident(db, "incident-1");
    expect(memory.retain).not.toHaveBeenCalled();
  });
  it("reports an incomplete status update honestly and permits retry", async () => {
    const { db } = database("pending", true);
    memory.retain.mockResolvedValue({ ok: true });
    const result = await syncSupplierIncident(db, "incident-1");
    expect(result.incident.memory_status).toBe("pending");
    expect(result.warning).toContain("status could not be updated");
  });
});
