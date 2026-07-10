import { SupabaseClient } from "@supabase/supabase-js";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { ApiError } from "../middleware/errors";
import { Item } from "../types/domain";
import { getItemById } from "./itemsService";

export interface ItemDetail {
  item: Item;
  price_trend: { date: string; unit_price: number }[];
  this_month: { quantity: number; spend: number };
  last_month: { quantity: number; spend: number };
}

export async function getItemDetail(db: SupabaseClient, itemId: string): Promise<ItemDetail> {
  const item = await getItemById(db, itemId);
  const now = new Date();
  const ninetyDaysAgo = format(subDays(now, 90), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("purchase_date, unit_price, quantity, total_amount")
    .eq("item_id", itemId)
    .is("deleted_at", null)
    .gte("purchase_date", ninetyDaysAgo)
    .order("purchase_date", { ascending: true });
  if (error) throw new ApiError(500, error.message);

  type Row = { purchase_date: string; unit_price: number; quantity: number; total_amount: number };
  const rows = (data ?? []) as Row[];

  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const thisMonth = { quantity: 0, spend: 0 };
  const lastMonth = { quantity: 0, spend: 0 };

  for (const r of rows) {
    if (r.purchase_date >= thisMonthStart) {
      thisMonth.quantity += r.quantity;
      thisMonth.spend += r.total_amount;
    } else if (r.purchase_date >= lastMonthStart && r.purchase_date <= lastMonthEnd) {
      lastMonth.quantity += r.quantity;
      lastMonth.spend += r.total_amount;
    }
  }

  return {
    item,
    price_trend: rows.map((r) => ({ date: r.purchase_date, unit_price: r.unit_price })),
    this_month: thisMonth,
    last_month: lastMonth,
  };
}
