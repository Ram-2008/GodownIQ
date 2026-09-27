import { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { ApiError, BadRequestError, NotFoundError } from "../middleware/errors";
import { CreateSupplierIncidentInput } from "../validation/supplierIncidents";
import { retainSupplierIncident } from "./supplierMemoryService";

export interface SupplierIncident extends CreateSupplierIncidentInput {
  supplier_name: string;
  created_by: string;
  created_at: string;
  memory_status: "pending" | "synced";
  memory_synced_at: string | null;
  memory_bank_id: string | null;
}

export async function listSupplierIncidents(db: SupabaseClient, page: number) {
  const start = (page - 1) * 20;
  const { data, error, count } = await db.from("supplier_incidents").select("*", { count: "exact" })
    .order("incident_date", { ascending: false }).order("created_at", { ascending: false })
    .order("id", { ascending: false }).range(start, start + 19);
  if (error) throw new ApiError(500, "Could not load incidents. Check that migration 0006 has been applied.");
  return { incidents: (data ?? []) as SupplierIncident[], total: count ?? 0, page_size: 20 };
}

export async function getSupplierIncident(db: SupabaseClient, id: string): Promise<SupplierIncident> {
  const { data, error } = await db.from("supplier_incidents").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "Could not load the incident.");
  if (!data) throw new NotFoundError("Incident not found.");
  return data as SupplierIncident;
}

export async function createSupplierIncident(db: SupabaseClient, userId: string, input: CreateSupplierIncidentInput) {
  const { data: supplier, error: supplierError } = await db.from("suppliers").select("id, name").eq("id", input.supplier_id).maybeSingle();
  if (supplierError) throw new ApiError(500, "Could not look up supplier.");
  if (!supplier) throw new BadRequestError("Choose an existing supplier.");

  // A stable client-generated ID makes a network retry safe without creating duplicates.
  const { error } = await db.from("supplier_incidents").upsert({
    ...input, supplier_name: supplier.name, created_by: userId,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new ApiError(500, "Could not save incident. Check the database migration and owner access.");
  const saved = await getSupplierIncident(db, input.id);
  if (saved.created_by !== userId || (Object.keys(input) as (keyof CreateSupplierIncidentInput)[]).some((key) => saved[key] !== input[key])) {
    throw new ApiError(409, "This submission ID already belongs to another incident. Reload the page before entering a new incident.");
  }
  return saved;
}

export async function syncSupplierIncident(db: SupabaseClient, id: string) {
  const incident = await getSupplierIncident(db, id);
  const bankId = `${env.HINDSIGHT_BANK_ID}-supplier-incidents`;
  if (incident.memory_status === "synced" && incident.memory_bank_id === bankId) {
    return { incident, warning: null };
  }
  // The database record already exists: external failure must never imply data loss.
  const result = await retainSupplierIncident(bankId, incident);
  if (!result.ok) return { incident, warning: result.message };

  const { data, error } = await db.from("supplier_incidents").update({
    memory_status: "synced", memory_synced_at: new Date().toISOString(), memory_bank_id: bankId,
  }).eq("id", id).select("*").single();
  if (error || !data) return {
    incident,
    warning: "Memory was sent, but its saved status could not be updated. Retry sync; the same memory document will be reused.",
  };
  return { incident: data as SupplierIncident, warning: null };
}
