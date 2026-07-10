import { SupabaseClient } from "@supabase/supabase-js";
import { format, subDays } from "date-fns";
import { ApiError } from "../middleware/errors";
import { MovementType, StockMovement, Unit } from "../types/domain";

export async function recordStockMovement(
  db: SupabaseClient,
  params: {
    itemId: string;
    type: MovementType;
    quantity: number;
    movementDate: string;
    createdBy: string;
    purchaseId?: string;
    note?: string;
  }
): Promise<StockMovement> {
  const { data, error } = await db
    .from("stock_movements")
    .insert({
      item_id: params.itemId,
      type: params.type,
      quantity: params.quantity,
      movement_date: params.movementDate,
      purchase_id: params.purchaseId ?? null,
      note: params.note ?? null,
      created_by: params.createdBy,
    })
    .select("*")
    .single();
  if (error) throw new ApiError(500, "Could not record stock movement: " + error.message);
  return data as StockMovement;
}

export interface StockOverviewRow {
  item_id: string;
  name: string;
  unit: Unit;
  current_stock: number;
  low_stock_threshold: number | null;
  avg_daily_outflow: number;
  days_of_stock_left: number | null;
  is_low_stock: boolean;
}

const OUTFLOW_WINDOW_DAYS = 30;

export async function getStockOverview(db: SupabaseClient): Promise<StockOverviewRow[]> {
  const { data: items, error: itemsError } = await db
    .from("items")
    .select("id, name, default_unit, current_stock, low_stock_threshold")
    .eq("track_stock", true)
    .order("name");
  if (itemsError) throw new ApiError(500, itemsError.message);
  if (!items || items.length === 0) return [];

  const since = format(subDays(new Date(), OUTFLOW_WINDOW_DAYS), "yyyy-MM-dd");
  const { data: movements, error: movementsError } = await db
    .from("stock_movements")
    .select("item_id, quantity")
    .eq("type", "out")
    .gte("movement_date", since);
  if (movementsError) throw new ApiError(500, movementsError.message);

  const outflowByItem = new Map<string, number>();
  for (const m of (movements ?? []) as { item_id: string; quantity: number }[]) {
    outflowByItem.set(m.item_id, (outflowByItem.get(m.item_id) ?? 0) + m.quantity);
  }

  return items.map((item: any) => {
    const totalOutflow = outflowByItem.get(item.id) ?? 0;
    const avgDailyOutflow = totalOutflow / OUTFLOW_WINDOW_DAYS;
    const currentStock = item.current_stock ?? 0;
    const daysLeft = avgDailyOutflow > 0 ? currentStock / avgDailyOutflow : null;
    return {
      item_id: item.id,
      name: item.name,
      unit: item.default_unit,
      current_stock: currentStock,
      low_stock_threshold: item.low_stock_threshold,
      avg_daily_outflow: avgDailyOutflow,
      days_of_stock_left: daysLeft,
      is_low_stock: item.low_stock_threshold != null && currentStock < item.low_stock_threshold,
    };
  });
}
