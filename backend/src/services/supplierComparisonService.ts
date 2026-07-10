import { SupabaseClient } from "@supabase/supabase-js";
import { format, startOfMonth } from "date-fns";
import { ApiError } from "../middleware/errors";

export interface SupplierBreakdownEntry {
  supplier_id: string;
  supplier_name: string;
  avg_unit_price: number;
  last_unit_price: number;
  last_purchase_date: string;
  total_quantity: number;
  is_cheapest: boolean;
}

export interface ItemSupplierBreakdown {
  item_id: string;
  item_name: string;
  suppliers: SupplierBreakdownEntry[];
}

export interface SupplierComparisonResult {
  by_item: ItemSupplierBreakdown[];
  overall_this_month: { supplier_id: string; supplier_name: string; total: number }[];
}

type Row = {
  item_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  items: { name: string } | null;
  suppliers: { name: string } | null;
};

export async function getSupplierComparison(db: SupabaseClient): Promise<SupplierComparisonResult> {
  const { data, error } = await db
    .from("purchases")
    .select("item_id, supplier_id, quantity, unit_price, total_amount, purchase_date, items(name), suppliers(name)")
    .is("deleted_at", null)
    .not("supplier_id", "is", null)
    .order("purchase_date", { ascending: true });
  if (error) throw new ApiError(500, error.message);

  const rows = (data ?? []) as unknown as Row[];

  const byItem = new Map<string, { name: string; bySupplier: Map<string, { name: string; quantity: number; spend: number; lastPrice: number; lastDate: string }> }>();

  for (const r of rows) {
    if (!byItem.has(r.item_id)) byItem.set(r.item_id, { name: r.items?.name ?? "Unknown item", bySupplier: new Map() });
    const itemEntry = byItem.get(r.item_id)!;
    const supplierEntry = itemEntry.bySupplier.get(r.supplier_id) ?? {
      name: r.suppliers?.name ?? "Unknown supplier",
      quantity: 0,
      spend: 0,
      lastPrice: r.unit_price,
      lastDate: r.purchase_date,
    };
    supplierEntry.quantity += r.quantity;
    supplierEntry.spend += r.total_amount;
    // rows are ordered by purchase_date ascending, so the latest one we see wins
    if (r.purchase_date >= supplierEntry.lastDate) {
      supplierEntry.lastPrice = r.unit_price;
      supplierEntry.lastDate = r.purchase_date;
    }
    itemEntry.bySupplier.set(r.supplier_id, supplierEntry);
  }

  const byItemResult: ItemSupplierBreakdown[] = [...byItem.entries()].map(([itemId, entry]) => {
    const suppliers = [...entry.bySupplier.entries()].map(([supplierId, s]) => ({
      supplier_id: supplierId,
      supplier_name: s.name,
      avg_unit_price: s.quantity > 0 ? s.spend / s.quantity : 0,
      last_unit_price: s.lastPrice,
      last_purchase_date: s.lastDate,
      total_quantity: s.quantity,
      is_cheapest: false,
    }));
    const minPrice = Math.min(...suppliers.map((s) => s.avg_unit_price));
    for (const s of suppliers) {
      if (s.avg_unit_price === minPrice) s.is_cheapest = true;
    }
    suppliers.sort((a, b) => a.avg_unit_price - b.avg_unit_price);
    return { item_id: itemId, item_name: entry.name, suppliers };
  });
  byItemResult.sort((a, b) => a.item_name.localeCompare(b.item_name));

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const overallTotals = new Map<string, { name: string; total: number }>();
  for (const r of rows) {
    if (r.purchase_date < monthStart) continue;
    const entry = overallTotals.get(r.supplier_id) ?? { name: r.suppliers?.name ?? "Unknown supplier", total: 0 };
    entry.total += r.total_amount;
    overallTotals.set(r.supplier_id, entry);
  }
  const overallThisMonth = [...overallTotals.entries()]
    .map(([supplier_id, v]) => ({ supplier_id, supplier_name: v.name, total: v.total }))
    .sort((a, b) => b.total - a.total);

  return { by_item: byItemResult, overall_this_month: overallThisMonth };
}
