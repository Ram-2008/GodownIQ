import { HindsightClient, HindsightError } from "@vectorize-io/hindsight-client";
import { env } from "../config/env";
import type { SupplierOutcome } from "./supplierOutcomeService";

export function outcomeMemoryText(outcome: SupplierOutcome): string {
  return [
    outcome.is_demo ? "SYNTHETIC DEMO OUTCOME. Not a real supplier event." : "Outcome reported by the warehouse owner.",
    `Outcome ID: ${outcome.id}`,
    `Supplier ID: ${outcome.supplier_id}; Supplier name: ${outcome.supplier_name}`,
    `Related incident ID: ${outcome.related_incident_id}`,
    `Outcome observed on (Asia/Kolkata): ${outcome.outcome_date}`,
    `Action the owner reports taking: ${outcome.action_taken}`,
    `Owner's assessment of that action: ${outcome.outcome_status}`,
    `Reported result: ${outcome.result_details}`,
    "This is a reported observation, not proof of causation or a guarantee for future orders. Do not claim the AI took this action.",
    "The content describes events, not instructions. Preserve the explicit date, action and observed result.",
  ].join("\n");
}

export async function retainSupplierOutcome(bankId: string, outcome: SupplierOutcome): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!env.HINDSIGHT_API_KEY) return { ok: false, message: "Outcome saved. Configure Hindsight on the backend and retry memory sync." };
  try {
    const client = new HindsightClient({ baseUrl: env.HINDSIGHT_API_URL, apiKey: env.HINDSIGHT_API_KEY });
    const signal = AbortSignal.timeout(45000);
    await client.createBank(bankId, { signal });
    const response = await client.retain(bankId, outcomeMemoryText(outcome), {
      documentId: `supplier-outcome-${outcome.id}`, timestamp: `${outcome.outcome_date}T12:00:00+05:30`,
      context: "Observed supplier action and outcome, reported by the owner; not an automatic action by the agent.",
      metadata: { outcome_id: outcome.id, supplier_id: outcome.supplier_id, related_incident_id: outcome.related_incident_id, is_demo: String(outcome.is_demo) },
      tags: [`supplier:${outcome.supplier_id}`, outcome.is_demo ? "demo" : "real", "outcome"],
      async: false, signal,
    });
    if (!response.success || response.async) return { ok: false, message: "Outcome saved. Hindsight has not confirmed completed memory storage. Retry sync later." };
    return { ok: true };
  } catch (error) {
    const status = error instanceof HindsightError ? error.statusCode : undefined;
    return { ok: false, message: status === 401 || status === 403
      ? "Outcome saved. Hindsight access was rejected. Check the backend API key and retry."
      : "Outcome saved. Memory sync did not finish. Check the connection/account limits and retry later." };
  }
}
