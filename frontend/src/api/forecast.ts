import { api } from "./client";
import { Unit } from "../types/domain";

export interface ForecastItemResult {
  item_id: string;
  item_name: string;
  unit: Unit;
  predicted_quantity: number;
  predicted_spend: number;
  predicted_stockout_date: string | null;
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

export interface ForecastResponse {
  generated_by: "ai" | "fallback";
  items: ForecastItemResult[];
  generated_at: string;
  can_regenerate: boolean;
  next_regeneration_at: string | null;
}

export const forecastApi = {
  get: () => api.get<ForecastResponse>("/forecast"),
  regenerate: () => api.post<ForecastResponse>("/forecast/regenerate"),
};
