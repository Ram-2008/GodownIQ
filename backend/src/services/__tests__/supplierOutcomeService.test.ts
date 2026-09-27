import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ retain: vi.fn() }));
vi.mock("../../config/env", () => ({ env: { HINDSIGHT_BANK_ID: "demo" } }));
vi.mock("../supplierOutcomeMemoryService", () => ({ retainSupplierOutcome: mocks.retain }));
import { createSupplierOutcome, syncSupplierOutcome } from "../supplierOutcomeService";
const input = { id: "33333333-3333-4333-8333-333333333333", supplier_id: "22222222-2222-4222-8222-222222222222",
  related_incident_id: "11111111-1111-4111-8111-111111111111", action_taken: "Requested dry packaging", outcome_status: "worked" as const,
  result_details: "All bags were dry.", outcome_date: "2026-09-27", is_demo: true };
function query(data: unknown, error: unknown = null) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }), single: vi.fn().mockResolvedValue({ data, error }) };
}
beforeEach(() => vi.clearAllMocks());
describe("outcome persistence", () => {
  it("rejects cross-supplier links before writing", async () => {
    const from = vi.fn().mockReturnValue(query({ supplier_id: "other", is_demo: true }));
    await expect(createSupplierOutcome({ from } as unknown as SupabaseClient, "owner", input)).rejects.toThrow("same real/demo mode");
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("rejects mixing real and demo data", async () => {
    const from = vi.fn().mockReturnValue(query({ supplier_id: input.supplier_id, is_demo: false }));
    await expect(createSupplierOutcome({ from } as unknown as SupabaseClient, "owner", input)).rejects.toThrow("same real/demo mode");
  });
  it("rejects an outcome before its related incident", async () => {
    const from = vi.fn().mockReturnValue(query({ supplier_id: input.supplier_id, is_demo: true, incident_date: "2026-09-28" }));
    await expect(createSupplierOutcome({ from } as unknown as SupabaseClient, "owner", input)).rejects.toThrow("before the related incident");
  });
  it("keeps the saved record pending after a memory failure", async () => {
    const from = vi.fn().mockReturnValue(query({ ...input, memory_status: "pending", memory_bank_id: null }));
    mocks.retain.mockResolvedValue({ ok: false, message: "Retry later" });
    const result = await syncSupplierOutcome({ from } as unknown as SupabaseClient, input.id);
    expect(result.outcome.memory_status).toBe("pending"); expect(result.warning).toBe("Retry later");
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("does not resend an already-synced outcome", async () => {
    const from = vi.fn().mockReturnValue(query({ ...input, memory_status: "synced", memory_bank_id: "demo-supplier-incidents" }));
    await syncSupplierOutcome({ from } as unknown as SupabaseClient, input.id);
    expect(mocks.retain).not.toHaveBeenCalled();
  });
});
