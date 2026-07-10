import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ApiError } from "../middleware/errors";
import { PurchaseWithNames } from "./purchaseService";

export interface PendingPaymentGroup {
  supplier_id: string | null;
  supplier_name: string;
  total: number;
  overdue_total: number;
  purchases: (PurchaseWithNames & { is_overdue: boolean })[];
}

export interface PendingPaymentsSummary {
  total_pending: number;
  total_overdue: number;
  groups: PendingPaymentGroup[];
}

export async function listPendingPayments(db: SupabaseClient): Promise<PendingPaymentsSummary> {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("*, items(name), suppliers(name)")
    .eq("payment_status", "pending")
    .is("deleted_at", null)
    .order("payment_due_date", { ascending: true, nullsFirst: false });
  if (error) throw new ApiError(500, error.message);

  const groups = new Map<string, PendingPaymentGroup>();
  let totalPending = 0;
  let totalOverdue = 0;

  for (const row of (data ?? []) as any[]) {
    const { items, suppliers, ...rest } = row;
    const purchase = { ...rest, item_name: items?.name ?? "Unknown item", supplier_name: suppliers?.name ?? null } as PurchaseWithNames;
    const isOverdue = !!purchase.payment_due_date && purchase.payment_due_date < today;
    const key = purchase.supplier_id ?? "none";

    if (!groups.has(key)) {
      groups.set(key, {
        supplier_id: purchase.supplier_id,
        supplier_name: purchase.supplier_name ?? "No supplier",
        total: 0,
        overdue_total: 0,
        purchases: [],
      });
    }
    const group = groups.get(key)!;
    group.total += purchase.total_amount;
    if (isOverdue) group.overdue_total += purchase.total_amount;
    group.purchases.push({ ...purchase, is_overdue: isOverdue });

    totalPending += purchase.total_amount;
    if (isOverdue) totalOverdue += purchase.total_amount;
  }

  return {
    total_pending: totalPending,
    total_overdue: totalOverdue,
    groups: [...groups.values()].sort((a, b) => b.total - a.total),
  };
}
