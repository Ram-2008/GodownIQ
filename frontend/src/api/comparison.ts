import { api } from "./client";

export interface ComparisonRow {
  item_id: string;
  item_name: string;
  period1: { quantity: number; spend: number };
  period2: { quantity: number; spend: number };
  quantity_change_pct: number | null;
  spend_change_pct: number | null;
  quantity_effect_pct: number | null;
  price_effect_pct: number | null;
  status: "compared" | "new" | "stopped";
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  totals: {
    period1: { quantity: number; spend: number };
    period2: { quantity: number; spend: number };
    spend_change_pct: number | null;
  };
}

export const comparisonApi = {
  get: (year1: number, month1: number, year2: number, month2: number) =>
    api.get<ComparisonResult>(`/comparison?year1=${year1}&month1=${month1}&year2=${year2}&month2=${month2}`),
};
