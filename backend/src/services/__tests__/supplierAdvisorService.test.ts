import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ recall: vi.fn(), generate: vi.fn(), env: {
  HINDSIGHT_API_KEY: "test-key", HINDSIGHT_API_URL: "http://localhost:8888", HINDSIGHT_BANK_ID: "test-bank",
  geminiConfigured: true, SUPPLIER_ADVISOR_MODEL: "test-model",
} }));
vi.mock("../../config/env", () => ({ env: mocks.env }));
vi.mock("../../config/geminiClient", () => ({ getGeminiClient: () => ({ models: { generateContent: mocks.generate } }), extractJsonBlock: (text: string) => { try { return JSON.parse(text); } catch { return null; } } }));
vi.mock("@vectorize-io/hindsight-client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@vectorize-io/hindsight-client")>();
  return { ...original, HindsightClient: vi.fn().mockImplementation(() => ({ recall: mocks.recall })) };
});
import { adviseSupplier, recalledIncidentIds, verifiedEvidence, verifiedOutcomeEvidence, combineEvidence } from "../supplierAdvisorService";
import type { SupplierIncident } from "../supplierIncidentService";
import type { SupplierOutcome } from "../supplierOutcomeService";
import { hasValidEvidenceReferences, supplierAdviceSchema } from "../../validation/supplierAdvisor";

const supplierId = "22222222-2222-4222-8222-222222222222";
const incidentId = "11111111-1111-4111-8111-111111111111";
const incident: SupplierIncident = {
  id: incidentId, supplier_id: supplierId, supplier_name: "Demo Traders",
  incident_date: "2026-09-24", incident_type: "damage", description: "Ten rice bags were damaged.",
  resolution: "Credit note issued", resolved_date: "2026-09-27", is_demo: true,
  created_by: "owner", created_at: "2026-09-27T09:00:00Z", memory_status: "synced", memory_synced_at: null, memory_bank_id: "test-bank-supplier-incidents",
};
const fact = { id: "fact-1", text: "Ten bags were damaged", document_id: `supplier-incident-${incidentId}` };
const input = { supplier_id: supplierId, question: "What should I check before buying 100 rice bags?", demo_mode: true };
const advice = { assessment: "A previous damage incident warrants inspection.", assessment_evidence_ids: ["E1"], risks: [],
  actions: [{ text: "Confirm inspection on arrival", reason: "Damaged bags were reported previously", evidence_ids: ["E1"] }], questions_to_confirm: [] };
const outcome: SupplierOutcome = {
  id: "33333333-3333-4333-8333-333333333333", supplier_id: supplierId, supplier_name: "Demo Traders", related_incident_id: incidentId,
  action_taken: "Requested moisture-resistant packaging", outcome_status: "worked", result_details: "All 100 bags arrived dry in the synthetic follow-up.",
  outcome_date: "2026-09-27", is_demo: true, created_by: "owner", created_at: "2026-09-27T10:00:00Z",
  memory_status: "synced", memory_synced_at: null, memory_bank_id: "test-bank-supplier-incidents",
};
const outcomeFact = { id: "outcome-fact-1", text: "Moisture-resistant packaging was reported to work", document_id: `supplier-outcome-${outcome.id}` };
function database(rows: SupplierIncident[] = [incident], outcomeRows: SupplierOutcome[] = [outcome]) {
  const supplierQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: supplierId, name: "Demo Traders" }, error: null }) };
  const sourceQuery = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve) };
  const outcomeQuery = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: outcomeRows, error: null }).then(resolve) };
  return { from: vi.fn((table: string) => table === "suppliers" ? supplierQuery : table === "supplier_outcomes" ? outcomeQuery : sourceQuery) } as unknown as SupabaseClient;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.env.geminiConfigured = true; mocks.env.HINDSIGHT_API_KEY = "test-key";
  mocks.recall.mockResolvedValue({ results: [fact] }); mocks.generate.mockResolvedValue({ text: JSON.stringify(advice) });
});
describe("supplier advisor evidence", () => {
  it("deduplicates multiple memories from one original incident", () => {
    const ids = recalledIncidentIds([fact, { ...fact, id: "fact-2" }]);
    expect(ids.size).toBe(1); expect(ids.get(incidentId)).toEqual(["fact-1", "fact-2"]);
  });
  it("rejects facts without a verifiable source document", () => {
    expect(recalledIncidentIds([{ id: "fact", text: `Incident ID: ${incidentId}` }]).size).toBe(0);
  });
  it("never mixes real and demo records or different suppliers", () => {
    const ids = recalledIncidentIds([fact]);
    expect(verifiedEvidence([incident], ids, supplierId, false, "2026-09-27")).toEqual([]);
    expect(verifiedEvidence([incident], ids, "another-supplier", true, "2026-09-27")).toEqual([]);
  });
  it("excludes future incidents and future resolutions from evidence", () => {
    const ids = recalledIncidentIds([fact]);
    expect(verifiedEvidence([{ ...incident, incident_date: "2026-09-30" }], ids, supplierId, true, "2026-09-27")).toEqual([]);
    const evidence = verifiedEvidence([{ ...incident, resolved_date: "2026-09-30" }], ids, supplierId, true, "2026-09-27");
    expect(evidence[0].resolution).toBeNull(); expect(evidence[0].note).toContain("future");
  });
  it("rejects unknown evidence citations", () => {
    const parsed = supplierAdviceSchema.parse({ ...advice, assessment_evidence_ids: ["E8"] });
    expect(hasValidEvidenceReferences(parsed, new Set(["E1"]))).toBe(false);
  });
  it("rejects future, wrong-mode and wrong-supplier outcomes", () => {
    const ids = recalledIncidentIds([outcomeFact], "outcome");
    expect(verifiedOutcomeEvidence([outcome], ids, supplierId, false, "2026-09-27")).toEqual([]);
    expect(verifiedOutcomeEvidence([outcome], ids, "other", true, "2026-09-27")).toEqual([]);
    expect(verifiedOutcomeEvidence([{ ...outcome, outcome_date: "2026-09-30" }], ids, supplierId, true, "2026-09-27")).toEqual([]);
  });
  it("keeps room for both incidents and outcomes in a bounded response", () => {
    const incidents = verifiedEvidence([incident], recalledIncidentIds([fact]), supplierId, true, "2026-09-27");
    const outcomes = verifiedOutcomeEvidence([outcome], recalledIncidentIds([outcomeFact], "outcome"), supplierId, true, "2026-09-27");
    const sources = combineEvidence(Array(8).fill(incidents[0]), Array(8).fill(outcomes[0]));
    expect(sources).toHaveLength(8);
    expect(sources.filter((source) => source.source_type === "outcome")).toHaveLength(4);
    expect(new Set(sources.map((source) => source.id)).size).toBe(8);
  });
});
describe("supplier advisor service", () => {
  it("uses strict supplier and demo tags and produces cited advice", async () => {
    const result = await adviseSupplier(database(), input);
    expect(mocks.recall).toHaveBeenCalledWith("test-bank-supplier-incidents", input.question, expect.objectContaining({ tags: [`supplier:${supplierId}`, "demo"], tagsMatch: "all_strict" }));
    expect(result.status).toBe("ready"); expect(result.evidence).toHaveLength(1); expect(result.advice).toEqual(advice);
  });
  it("retains source evidence when Gemini is unavailable", async () => {
    mocks.generate.mockRejectedValue(new Error("private provider error"));
    const result = await adviseSupplier(database(), input);
    expect(result.status).toBe("ai_unavailable"); expect(result.evidence).toHaveLength(1); expect(result.advice).toBeNull();
    expect(JSON.stringify(result)).not.toContain("private provider error");
  });
  it("never invents supplier advice when recall returns nothing", async () => {
    mocks.recall.mockResolvedValue({ results: [] });
    const result = await adviseSupplier(database(), input);
    expect(result.status).toBe("no_memory"); expect(result.advice).toBeNull(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("does not use database-only history when Hindsight fails", async () => {
    mocks.recall.mockRejectedValue(new Error("offline"));
    const result = await adviseSupplier(database(), input);
    expect(result.status).toBe("memory_unavailable"); expect(result.evidence).toEqual([]); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("keeps verified evidence visible when a Gemini key is missing", async () => {
    mocks.env.geminiConfigured = false;
    const result = await adviseSupplier(database(), input);
    expect(result.status).toBe("ai_unavailable"); expect(result.evidence).toHaveLength(1); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects an AI answer citing a source that was never recalled", async () => {
    mocks.generate.mockResolvedValue({ text: JSON.stringify({ ...advice, assessment_evidence_ids: ["E8"] }) });
    const result = await adviseSupplier(database(), input);
    expect(result.status).toBe("ai_unavailable"); expect(result.advice).toBeNull();
  });
  it("does not pass extracted guessed dates to Gemini as source truth", async () => {
    mocks.recall.mockResolvedValue({ results: [{ ...fact, text: "Incident happened on an invented date 2027-01-01" }] });
    await adviseSupplier(database(), input);
    const contents = mocks.generate.mock.calls[0][0].contents;
    expect(contents).toContain("2026-09-24"); expect(contents).not.toContain("2027-01-01");
  });
  it("adds a newly recalled outcome to the next request and validates its citation", async () => {
    const first = await adviseSupplier(database(), input);
    expect(first.evidence.map((source) => source.source_type)).toEqual(["incident"]);
    mocks.recall.mockResolvedValue({ results: [fact, outcomeFact] });
    mocks.generate.mockResolvedValue({ text: JSON.stringify({ ...advice,
      actions: [{ text: "Request the packaging again", reason: "The owner reported a dry follow-up delivery", evidence_ids: ["E2"] }],
    }) });
    const second = await adviseSupplier(database(), input);
    expect(second.status).toBe("ready");
    expect(second.evidence.map((source) => source.source_type)).toEqual(["incident", "outcome"]);
    expect(mocks.generate.mock.calls[1][0].contents).toContain(outcome.action_taken);
    expect(second.advice?.actions[0].evidence_ids).toEqual(["E2"]);
  });
  it("exposes an incomplete outcome search rather than claiming complete history", async () => {
    mocks.recall.mockResolvedValueOnce({ results: [fact] }).mockRejectedValueOnce(new Error("timeout"));
    const result = await adviseSupplier(database(), input);
    expect(result.warning).toContain("outcome search did not finish");
  });
});
