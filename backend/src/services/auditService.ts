import { SupabaseClient } from "@supabase/supabase-js";
import { AuditAction } from "../types/domain";

export async function writeAuditLog(
  db: SupabaseClient,
  params: {
    purchaseId: string;
    action: AuditAction;
    changedBy: string;
    oldValues?: unknown;
    newValues?: unknown;
  }
): Promise<void> {
  const { error } = await db.from("purchase_audit_log").insert({
    purchase_id: params.purchaseId,
    action: params.action,
    changed_by: params.changedBy,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
  });
  if (error) {
    // Audit logging must never block the primary operation from having already succeeded;
    // surface it loudly server-side instead.
    console.error("Failed to write audit log:", error.message, params);
  }
}
