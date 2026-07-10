import { SupabaseClient } from "@supabase/supabase-js";
import { eachDayOfInterval, endOfMonth, format } from "date-fns";
import { ApiError } from "../middleware/errors";
import { AuthenticatedProfile } from "../types/express";
import { canModifyPurchase, PurchaseWithNames } from "./purchaseService";

export interface CalendarDayTotal {
  date: string;
  total: number;
  count: number;
}

export async function getCalendarMonth(db: SupabaseClient, year: number, month: number): Promise<CalendarDayTotal[]> {
  const monthStartDate = new Date(year, month - 1, 1);
  const monthStart = format(monthStartDate, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthStartDate), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("purchase_date, total_amount")
    .is("deleted_at", null)
    .gte("purchase_date", monthStart)
    .lte("purchase_date", monthEnd);
  if (error) throw new ApiError(500, error.message);

  const totals = new Map<string, CalendarDayTotal>();
  for (const day of eachDayOfInterval({ start: monthStartDate, end: endOfMonth(monthStartDate) })) {
    const key = format(day, "yyyy-MM-dd");
    totals.set(key, { date: key, total: 0, count: 0 });
  }
  for (const row of (data ?? []) as { purchase_date: string; total_amount: number }[]) {
    const entry = totals.get(row.purchase_date);
    if (entry) {
      entry.total += row.total_amount;
      entry.count += 1;
    }
  }

  return [...totals.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCalendarDay(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  date: string
): Promise<(PurchaseWithNames & { can_edit: boolean })[]> {
  const { data, error } = await db
    .from("purchases")
    .select("*, items(name), suppliers(name)")
    .eq("purchase_date", date)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new ApiError(500, error.message);

  return (data ?? []).map((row: any) => {
    const { items, suppliers, ...rest } = row;
    const purchase = { ...rest, item_name: items?.name ?? "Unknown item", supplier_name: suppliers?.name ?? null } as PurchaseWithNames;
    return { ...purchase, can_edit: canModifyPurchase(profile, purchase) };
  });
}
