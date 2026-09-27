import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createBank: vi.fn(), retain: vi.fn(), env: { HINDSIGHT_API_KEY: "private-test-key", HINDSIGHT_API_URL: "http://localhost:8888" } }));
vi.mock("../../config/env", () => ({ env: mocks.env }));
vi.mock("@vectorize-io/hindsight-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@vectorize-io/hindsight-client")>();
  return { ...original, HindsightClient: vi.fn().mockImplementation(() => ({ createBank: mocks.createBank, retain: mocks.retain })) };
});
import { outcomeMemoryText, retainSupplierOutcome } from "../supplierOutcomeMemoryService";
import type { SupplierOutcome } from "../supplierOutcomeService";
const outcome: SupplierOutcome = { id: "outcome-1", supplier_id: "supplier-1", supplier_name: "Demo Traders", related_incident_id: "incident-1",
  action_taken: "Requested dry packaging", outcome_status: "did_not_work", result_details: "Two bags were still damp.", outcome_date: "2026-09-27",
  is_demo: true, created_by: "owner", created_at: "2026-09-27T10:00:00Z", memory_status: "pending", memory_synced_at: null, memory_bank_id: null };
beforeEach(() => { vi.clearAllMocks(); mocks.env.HINDSIGHT_API_KEY = "private-test-key"; mocks.createBank.mockResolvedValue({}); mocks.retain.mockResolvedValue({ success: true, async: false }); });
describe("outcome memory", () => {
  it("retains failure, source date, synthetic status and stable identity", async () => {
    await retainSupplierOutcome("bank", outcome);
    const call = mocks.retain.mock.calls[0];
    expect(call[1]).toContain("did_not_work"); expect(call[1]).toContain("SYNTHETIC DEMO OUTCOME");
    expect(call[2]).toMatchObject({ documentId: "supplier-outcome-outcome-1", timestamp: "2026-09-27T12:00:00+05:30", tags: ["supplier:supplier-1", "demo", "outcome"] });
    expect(outcomeMemoryText(outcome)).toContain("not proof of causation");
  });
  it("does not mark queued operations as completed", async () => {
    mocks.retain.mockResolvedValue({ success: true, async: true });
    expect(await retainSupplierOutcome("bank", outcome)).toMatchObject({ ok: false });
  });
  it("does not expose a provider exception containing the key", async () => {
    mocks.retain.mockRejectedValue(new Error("private-test-key"));
    const result = await retainSupplierOutcome("bank", outcome);
    expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain("private-test-key");
  });
});
