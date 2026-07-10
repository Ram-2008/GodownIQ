import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../middleware/errors";
import { AuditAction } from "../types/domain";

export interface AuditLogEntry {
  id: string;
  purchase_id: string;
  action: AuditAction;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  old_values: unknown;
  new_values: unknown;
}

export async function listAuditLog(db: SupabaseClient, page: number, pageSize: number): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const start = (page - 1) * pageSize;
  const { data, error, count } = await db
    .from("purchase_audit_log")
    .select("id, purchase_id, action, changed_by, changed_at, old_values, new_values, profiles(full_name)", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range(start, start + pageSize - 1);
  if (error) throw new ApiError(500, error.message);

  const entries = (data ?? []).map((row: any) => {
    const { profiles, ...rest } = row;
    return { ...rest, changed_by_name: profiles?.full_name ?? "Unknown user" } as AuditLogEntry;
  });

  return { entries, total: count ?? 0 };
}
