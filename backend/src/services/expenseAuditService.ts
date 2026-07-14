import { SupabaseClient } from "@supabase/supabase-js";
import { AuditAction } from "../types/domain";

export async function writeExpenseAuditLog(
  db: SupabaseClient,
  params: {
    expenseId: string;
    action: AuditAction;
    changedBy: string;
    oldValues?: unknown;
    newValues?: unknown;
  }
): Promise<void> {
  const { error } = await db.from("expense_audit_log").insert({
    expense_id: params.expenseId,
    action: params.action,
    changed_by: params.changedBy,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
  });
  if (error) {
    console.error("Failed to write expense audit log:", error.message, params);
  }
}
