import { SupabaseClient } from "@supabase/supabase-js";
import { endOfMonth, format } from "date-fns";
import { ApiError } from "../middleware/errors";

export interface MonthPeriod {
  year: number;
  month: number;
}

interface PeriodTotals {
  quantity: number;
  spend: number;
}

export interface ComparisonRow {
  item_id: string;
  item_name: string;
  period1: PeriodTotals;
  period2: PeriodTotals;
  quantity_change_pct: number | null;
  spend_change_pct: number | null;
  quantity_effect_pct: number | null;
  price_effect_pct: number | null;
  status: "compared" | "new" | "stopped";
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  totals: {
    period1: PeriodTotals;
    period2: PeriodTotals;
    spend_change_pct: number | null;
  };
}

/**
 * Exact price/volume decomposition of a spend change (variance analysis):
 * quantityEffect (change valued at the old price) + priceEffect (price change applied
 * to the new quantity) always sum to exactly the spend change, so the two percentages
 * shown to the user always add up to the headline spend-change percentage.
 */
export function attributeSpendChange(q1: number, s1: number, q2: number, s2: number) {
  const p1 = q1 > 0 ? s1 / q1 : 0;
  const quantityEffect = (q2 - q1) * p1;
  const priceEffect = s2 - s1 - quantityEffect;
  return {
    quantity_change_pct: q1 > 0 ? ((q2 - q1) / q1) * 100 : null,
    spend_change_pct: s1 > 0 ? ((s2 - s1) / s1) * 100 : null,
    quantity_effect_pct: s1 > 0 ? (quantityEffect / s1) * 100 : null,
    price_effect_pct: s1 > 0 ? (priceEffect / s1) * 100 : null,
  };
}

async function fetchPeriodTotals(db: SupabaseClient, period: MonthPeriod): Promise<Map<string, PeriodTotals & { name: string }>> {
  const start = new Date(period.year, period.month - 1, 1);
  const from = format(start, "yyyy-MM-dd");
  const to = format(endOfMonth(start), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("item_id, quantity, total_amount, items(name)")
    .is("deleted_at", null)
    .gte("purchase_date", from)
    .lte("purchase_date", to);
  if (error) throw new ApiError(500, error.message);

  const totals = new Map<string, PeriodTotals & { name: string }>();
  for (const row of (data ?? []) as any[]) {
    const existing = totals.get(row.item_id) ?? { name: row.items?.name ?? "Unknown item", quantity: 0, spend: 0 };
    existing.quantity += row.quantity;
    existing.spend += row.total_amount;
    totals.set(row.item_id, existing);
  }
  return totals;
}

export async function getMonthlyComparison(db: SupabaseClient, period1: MonthPeriod, period2: MonthPeriod): Promise<ComparisonResult> {
  const [totals1, totals2] = await Promise.all([fetchPeriodTotals(db, period1), fetchPeriodTotals(db, period2)]);
  const itemIds = new Set([...totals1.keys(), ...totals2.keys()]);

  const rows: ComparisonRow[] = [...itemIds].map((itemId) => {
    const t1 = totals1.get(itemId) ?? { name: totals2.get(itemId)!.name, quantity: 0, spend: 0 };
    const t2 = totals2.get(itemId) ?? { name: totals1.get(itemId)!.name, quantity: 0, spend: 0 };
    const attribution = attributeSpendChange(t1.quantity, t1.spend, t2.quantity, t2.spend);
    const status: ComparisonRow["status"] = t1.quantity === 0 ? "new" : t2.quantity === 0 ? "stopped" : "compared";

    return {
      item_id: itemId,
      item_name: t1.name,
      period1: { quantity: t1.quantity, spend: t1.spend },
      period2: { quantity: t2.quantity, spend: t2.spend },
      ...attribution,
      status,
    };
  });

  rows.sort((a, b) => b.period2.spend - a.period2.spend);

  const totalPeriod1 = { quantity: 0, spend: 0 };
  const totalPeriod2 = { quantity: 0, spend: 0 };
  for (const row of rows) {
    totalPeriod1.quantity += row.period1.quantity;
    totalPeriod1.spend += row.period1.spend;
    totalPeriod2.quantity += row.period2.quantity;
    totalPeriod2.spend += row.period2.spend;
  }

  return {
    rows,
    totals: {
      period1: totalPeriod1,
      period2: totalPeriod2,
      spend_change_pct: totalPeriod1.spend > 0 ? ((totalPeriod2.spend - totalPeriod1.spend) / totalPeriod1.spend) * 100 : null,
    },
  };
}
