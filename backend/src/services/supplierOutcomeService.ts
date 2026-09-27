import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { ApiError, BadRequestError, NotFoundError } from "../middleware/errors";
import { CreateSupplierOutcomeInput } from "../validation/supplierOutcomes";
import { retainSupplierOutcome } from "./supplierOutcomeMemoryService";

export interface SupplierOutcome extends CreateSupplierOutcomeInput {
  supplier_name: string; created_by: string; created_at: string;
  memory_status: "pending" | "synced"; memory_synced_at: string | null; memory_bank_id: string | null;
}

export async function getSupplierOutcome(db: SupabaseClient, id: string): Promise<SupplierOutcome> {
  const { data, error } = await db.from("supplier_outcomes").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "Could not load outcome. Check migration 0007.");
  if (!data) throw new NotFoundError("Outcome not found.");
  return data as SupplierOutcome;
}

export async function listSupplierOutcomes(db: SupabaseClient, supplierId: string, demoMode: boolean, page: number) {
  const start = (page - 1) * 10;
  const { data, error, count } = await db.from("supplier_outcomes").select("*", { count: "exact" })
    .eq("supplier_id", supplierId).eq("is_demo", demoMode)
    .order("outcome_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + 9);
  if (error) throw new ApiError(500, "Could not load outcomes. Apply migration 0007_supplier_outcomes.sql first.");
  return { outcomes: (data ?? []) as SupplierOutcome[], total: count ?? 0, page_size: 10 };
}

export async function createSupplierOutcome(db: SupabaseClient, userId: string, input: CreateSupplierOutcomeInput) {
  const { data: incident, error } = await db.from("supplier_incidents").select("id, supplier_id, supplier_name, incident_date, is_demo")
    .eq("id", input.related_incident_id).maybeSingle();
  if (error) throw new ApiError(500, "Could not verify the related incident.");
  if (!incident || incident.supplier_id !== input.supplier_id || incident.is_demo !== input.is_demo) {
    throw new BadRequestError("The related incident must belong to this supplier and the same real/demo mode.");
  }
  if (input.outcome_date < incident.incident_date) throw new BadRequestError("The outcome cannot be before the related incident.");
  const { error: saveError } = await db.from("supplier_outcomes").upsert({
    ...input, supplier_name: incident.supplier_name, created_by: userId,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (saveError) throw new ApiError(500, "Could not save outcome. Check migration 0007 and owner access.");
  const saved = await getSupplierOutcome(db, input.id);
  if (saved.created_by !== userId || (Object.keys(input) as (keyof CreateSupplierOutcomeInput)[]).some((key) => saved[key] !== input[key])) {
    throw new ApiError(409, "This submission ID already belongs to a different outcome. Reload before recording a new outcome.");
  }
  return saved;
}

export async function syncSupplierOutcome(db: SupabaseClient, id: string) {
  const outcome = await getSupplierOutcome(db, id);
  const bankId = `${env.HINDSIGHT_BANK_ID}-supplier-incidents`;
  if (outcome.memory_status === "synced" && outcome.memory_bank_id === bankId) return { outcome, warning: null };
  const result = await retainSupplierOutcome(bankId, outcome);
  if (!result.ok) return { outcome, warning: result.message };
  const { data, error } = await db.from("supplier_outcomes").update({
    memory_status: "synced", memory_synced_at: new Date().toISOString(), memory_bank_id: bankId,
  }).eq("id", id).select("*").single();
  if (error || !data) return { outcome, warning: "Outcome memory was sent, but its status could not be updated. Retry sync; the same document will be reused." };
  return { outcome: data as SupplierOutcome, warning: null };
}
