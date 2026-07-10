import { api } from "./client";
import { Unit } from "../types/domain";

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

export const stockApi = {
  list: () => api.get<{ items: StockOverviewRow[] }>("/stock").then((r) => r.items),
  stockOut: (item_id: string, quantity: number, movement_date: string, note?: string) =>
    api.post("/stock/out", { item_id, quantity, movement_date, note }),
  adjustment: (item_id: string, new_count: number, movement_date: string, note?: string) =>
    api.post("/stock/adjustment", { item_id, new_count, movement_date, note }),
};
