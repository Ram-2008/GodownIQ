import { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";
import { ApiError } from "../middleware/errors";
import { Unit } from "../types/domain";

export interface QuickChip {
  item_id: string;
  item_name: string;
  unit: Unit;
  last_unit_price: number;
  median_quantity: number;
}

const MIN_TOTAL_PURCHASES = 5;
const MAX_CHIPS = 10;
const LOOKBACK_DAYS = 30;

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mode<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/** score = (purchases in last 7 days x 3) + (purchases in last 30 days) */
export function scoreRecencyWeighted(count7: number, count30: number): number {
  return count7 * 3 + count30;
}

export async function computeQuickChips(db: SupabaseClient): Promise<QuickChip[]> {
  const { count: totalCount, error: countError } = await db
    .from("purchases")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (countError) throw new ApiError(500, countError.message);
  if (!totalCount || totalCount < MIN_TOTAL_PURCHASES) return [];

  const since = format(subDays(new Date(), LOOKBACK_DAYS), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("item_id, quantity, unit, unit_price, purchase_date, created_at, items(name)")
    .is("deleted_at", null)
    .gte("purchase_date", since)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new ApiError(500, error.message);

  type Row = { item_id: string; quantity: number; unit: Unit; unit_price: number; purchase_date: string; created_at: string; items: { name: string } | null };
  const rows = (data ?? []) as unknown as Row[];

  const byItem = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byItem.get(row.item_id) ?? [];
    list.push(row);
    byItem.set(row.item_id, list);
  }

  const scored = [...byItem.entries()].map(([itemId, itemRows]) => {
    const count30 = itemRows.length;
    const count7 = itemRows.filter((r) => r.purchase_date >= sevenDaysAgo).length;
    const score = scoreRecencyWeighted(count7, count30);
    // itemRows is already sorted purchase_date desc, created_at desc from the query above
    const latest = itemRows[0];
    return {
      itemId,
      score,
      chip: {
        item_id: itemId,
        item_name: latest.items?.name ?? "Unknown item",
        unit: mode(itemRows.map((r) => r.unit)),
        last_unit_price: latest.unit_price,
        median_quantity: median(itemRows.map((r) => r.quantity)),
      } satisfies QuickChip,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_CHIPS).map((s) => s.chip);
}
