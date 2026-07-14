import { SupabaseClient } from "@supabase/supabase-js";
import { eachDayOfInterval, format, startOfMonth } from "date-fns";
import { ApiError } from "../middleware/errors";
import { Alert } from "../types/domain";

export interface DashboardSummary {
  today_spend: number;
  month_spend: number;
  today_expenses: number;
  month_expenses: number;
  pending_total: number;
  active_alerts_count: number;
  daily_spend: { date: string; total: number }[];
  top_items: { item_id: string; item_name: string; total: number }[];
  alerts: Alert[];
}

type PurchaseRow = { purchase_date: string; total_amount: number; item_id: string; items: { name: string } | null };

export async function getDashboardSummary(db: SupabaseClient): Promise<DashboardSummary> {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const today = format(now, "yyyy-MM-dd");

  const { data: monthData, error: monthError } = await db
    .from("purchases")
    .select("purchase_date, total_amount, item_id, items(name)")
    .is("deleted_at", null)
    .gte("purchase_date", monthStart)
    .lte("purchase_date", today);
  if (monthError) throw new ApiError(500, monthError.message);
  const monthPurchases = (monthData ?? []) as unknown as PurchaseRow[];

  const dailyMap = new Map<string, number>();
  for (const day of eachDayOfInterval({ start: startOfMonth(now), end: now })) {
    dailyMap.set(format(day, "yyyy-MM-dd"), 0);
  }
  const itemTotals = new Map<string, { name: string; total: number }>();
  let monthSpend = 0;
  let todaySpend = 0;

  for (const p of monthPurchases) {
    monthSpend += p.total_amount;
    if (p.purchase_date === today) todaySpend += p.total_amount;
    dailyMap.set(p.purchase_date, (dailyMap.get(p.purchase_date) ?? 0) + p.total_amount);
    const key = p.item_id;
    const existing = itemTotals.get(key);
    const name = p.items?.name ?? "Unknown item";
    itemTotals.set(key, { name, total: (existing?.total ?? 0) + p.total_amount });
  }

  const topItems = [...itemTotals.entries()]
    .map(([item_id, v]) => ({ item_id, item_name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const { data: pendingData, error: pendingError } = await db
    .from("purchases")
    .select("total_amount")
    .is("deleted_at", null)
    .eq("payment_status", "pending");
  if (pendingError) throw new ApiError(500, pendingError.message);
  const pendingTotal = (pendingData ?? []).reduce((sum, r: { total_amount: number }) => sum + r.total_amount, 0);

  const { data: monthExpenseData, error: monthExpenseError } = await db
    .from("expenses")
    .select("expense_date, amount")
    .is("deleted_at", null)
    .gte("expense_date", monthStart)
    .lte("expense_date", today);
  if (monthExpenseError) throw new ApiError(500, monthExpenseError.message);
  let monthExpenses = 0;
  let todayExpenses = 0;
  for (const e of (monthExpenseData ?? []) as { expense_date: string; amount: number }[]) {
    monthExpenses += e.amount;
    if (e.expense_date === today) todayExpenses += e.amount;
  }

  const { data: alertsData, error: alertsError } = await db
    .from("alerts")
    .select("*")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (alertsError) throw new ApiError(500, alertsError.message);

  return {
    today_spend: todaySpend,
    month_spend: monthSpend,
    today_expenses: todayExpenses,
    month_expenses: monthExpenses,
    pending_total: pendingTotal,
    active_alerts_count: (alertsData ?? []).length,
    daily_spend: [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total })),
    top_items: topItems,
    alerts: (alertsData ?? []) as Alert[],
  };
}
