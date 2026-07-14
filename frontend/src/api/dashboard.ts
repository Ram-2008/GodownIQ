import { api } from "./client";
import { Alert, Item } from "../types/domain";

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

export interface ItemDetail {
  item: Item;
  price_trend: { date: string; unit_price: number }[];
  this_month: { quantity: number; spend: number };
  last_month: { quantity: number; spend: number };
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard"),
  itemDetail: (id: string) => api.get<ItemDetail>(`/dashboard/items/${id}`),
};
