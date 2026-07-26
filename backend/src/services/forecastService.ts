import { SupabaseClient } from "@supabase/supabase-js";
import { addDays, differenceInCalendarDays, endOfMonth, format, getDay, startOfMonth, subDays, subMonths } from "date-fns";
import { env } from "../config/env";
import { extractJsonBlock, getGeminiClient } from "../config/geminiClient";
import { ApiError, BadRequestError } from "../middleware/errors";
import { Unit } from "../types/domain";
import { forecastAiResponseSchema } from "../validation/forecast";
import { listItems } from "./itemsService";
import { getStockOverview } from "./stockService";
import { createAlert, hasActiveAlert } from "./alertService";

const FORECAST_MODEL = "gemini-3.5-flash";
const CACHE_FRESHNESS_HOURS = 24;
const STOCKOUT_ALERT_WINDOW_DAYS = 7;

type Confidence = "low" | "medium" | "high";

export interface ItemForecastStats {
  item_id: string;
  item_name: string;
  unit: Unit;
  days_of_history: number;
  daily_avg_quantity: number;
  daily_avg_spend: number;
  weekly_pattern: number[];
  mom_quantity_change_pct: number | null;
  mom_spend_change_pct: number | null;
  track_stock: boolean;
  current_stock: number | null;
  avg_daily_outflow: number | null;
}

export interface ForecastItemResult {
  item_id: string;
  item_name: string;
  unit: Unit;
  predicted_quantity: number;
  predicted_spend: number;
  predicted_stockout_date: string | null;
  confidence: Confidence;
  reasoning: string;
}

export interface ForecastPayload {
  generated_by: "ai" | "fallback";
  items: ForecastItemResult[];
}

export interface ForecastResponse extends ForecastPayload {
  generated_at: string;
  can_regenerate: boolean;
  next_regeneration_at: string | null;
}

type PurchaseRow = { quantity: number; total_amount: number; purchase_date: string };

async function computeItemStats(db: SupabaseClient): Promise<ItemForecastStats[]> {
  const items = await listItems(db);
  const stockOverview = await getStockOverview(db);
  const stockByItem = new Map(stockOverview.map((s) => [s.item_id, s]));
  const today = new Date();

  const stats: ItemForecastStats[] = [];

  for (const item of items) {
    const { data, error } = await db
      .from("purchases")
      .select("quantity, total_amount, purchase_date")
      .eq("item_id", item.id)
      .is("deleted_at", null)
      .order("purchase_date", { ascending: true });
    if (error) throw new ApiError(500, error.message);

    const rows = (data ?? []) as PurchaseRow[];
    if (rows.length === 0) continue;

    const firstDate = new Date(rows[0].purchase_date);
    const daysOfHistory = differenceInCalendarDays(today, firstDate) + 1;

    const windowStart = subDays(today, 90);
    const windowRows = rows.filter((r) => new Date(r.purchase_date) >= windowStart);
    const windowDays = Math.max(1, Math.min(daysOfHistory, 90));
    const sumQty = windowRows.reduce((sum, r) => sum + r.quantity, 0);
    const sumSpend = windowRows.reduce((sum, r) => sum + r.total_amount, 0);

    const weekdayTotals = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);
    for (const r of windowRows) {
      const day = getDay(new Date(r.purchase_date));
      weekdayTotals[day] += r.quantity;
      weekdayCounts[day] += 1;
    }
    const weeklyPattern = weekdayTotals.map((total, i) => (weekdayCounts[i] > 0 ? Number((total / weekdayCounts[i]).toFixed(2)) : 0));

    const thisMonthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const lastMonthStart = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
    const lastMonthEnd = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
    let thisQty = 0;
    let thisSpend = 0;
    let lastQty = 0;
    let lastSpend = 0;
    for (const r of rows) {
      if (r.purchase_date >= thisMonthStart) {
        thisQty += r.quantity;
        thisSpend += r.total_amount;
      } else if (r.purchase_date >= lastMonthStart && r.purchase_date <= lastMonthEnd) {
        lastQty += r.quantity;
        lastSpend += r.total_amount;
      }
    }

    const stockInfo = stockByItem.get(item.id);

    stats.push({
      item_id: item.id,
      item_name: item.name,
      unit: item.default_unit,
      days_of_history: daysOfHistory,
      daily_avg_quantity: Number((sumQty / windowDays).toFixed(3)),
      daily_avg_spend: Number((sumSpend / windowDays).toFixed(2)),
      weekly_pattern: weeklyPattern,
      mom_quantity_change_pct: lastQty > 0 ? Number((((thisQty - lastQty) / lastQty) * 100).toFixed(1)) : null,
      mom_spend_change_pct: lastSpend > 0 ? Number((((thisSpend - lastSpend) / lastSpend) * 100).toFixed(1)) : null,
      track_stock: item.track_stock,
      current_stock: item.current_stock,
      avg_daily_outflow: stockInfo?.avg_daily_outflow ?? null,
    });
  }

  return stats;
}

function fallbackPredictionFor(stat: ItemForecastStats): { predicted_quantity: number; predicted_spend: number; confidence: Confidence; reasoning: string } {
  const predictedQuantity = Number((stat.daily_avg_quantity * 30).toFixed(2));
  const predictedSpend = Number((stat.daily_avg_spend * 30).toFixed(2));
  const confidence: Confidence = stat.days_of_history < 21 ? "low" : stat.days_of_history < 60 ? "medium" : "high";
  return {
    predicted_quantity: predictedQuantity,
    predicted_spend: predictedSpend,
    confidence,
    reasoning: `Basic forecast (AI unavailable): averages ${stat.daily_avg_quantity} ${stat.unit}/day over the last ${Math.min(stat.days_of_history, 90)} days.`,
  };
}

const FORECAST_SYSTEM_PROMPT = `You are a demand-forecasting assistant for a small Indian warehouse business. You are given per-item purchase statistics (no raw transaction data) and must predict next-month purchasing for each item.

Respond with ONLY a JSON array, no other text, one entry per item exactly in this shape:
[{"item_id": string, "predicted_quantity": number, "predicted_spend": number, "confidence": "low"|"medium"|"high", "reasoning": string}]

Guidance:
- predicted_quantity and predicted_spend are your best estimate for the next 30 days.
- Use days_of_history, mom_quantity_change_pct, mom_spend_change_pct, and weekly_pattern to judge trend and seasonality.
- Set confidence "low" if days_of_history is under 21, or the trend is erratic; "high" only with a long, consistent history.
- reasoning must be one short sentence explaining the prediction in plain English for a non-technical shop owner.
- Include every item_id given to you exactly once.`;

async function callGeminiForForecast(stats: ItemForecastStats[]): Promise<Map<string, { predicted_quantity: number; predicted_spend: number; confidence: Confidence; reasoning: string }> | null> {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: FORECAST_MODEL,
      contents: JSON.stringify(stats),
      config: { systemInstruction: FORECAST_SYSTEM_PROMPT, maxOutputTokens: 4000 },
    });

    const rawText = response.text;
    if (!rawText) return null;

    const parsedJson = extractJsonBlock(rawText);
    const result = forecastAiResponseSchema.safeParse(parsedJson);
    if (!result.success) return null;

    return new Map(result.data.map((r) => [r.item_id, r]));
  } catch (err) {
    console.error("Gemini forecast request failed, using fallback:", err);
    return null;
  }
}

function stockoutDateFor(stat: ItemForecastStats): string | null {
  if (!stat.track_stock || stat.current_stock == null || stat.avg_daily_outflow == null || stat.avg_daily_outflow <= 0) return null;
  const daysLeft = Math.floor(stat.current_stock / stat.avg_daily_outflow);
  return format(addDays(new Date(), Math.max(0, daysLeft)), "yyyy-MM-dd");
}

async function raiseStockoutRemindersIfNeeded(db: SupabaseClient, items: ForecastItemResult[]): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  const cutoff = format(addDays(new Date(), STOCKOUT_ALERT_WINDOW_DAYS), "yyyy-MM-dd");

  for (const item of items) {
    if (!item.predicted_stockout_date) continue;
    if (item.predicted_stockout_date < today || item.predicted_stockout_date > cutoff) continue;

    const alreadyAlerted = await hasActiveAlert(db, "reorder_reminder", item.item_id);
    if (alreadyAlerted) continue;

    await createAlert(
      "reorder_reminder",
      `${item.item_name} is projected to run out around ${item.predicted_stockout_date} at current usage — consider reordering soon`,
      item.item_id
    );
  }
}

async function getLatestCache(db: SupabaseClient): Promise<{ generated_at: string; payload: ForecastPayload } | null> {
  const { data, error } = await db.from("forecasts_cache").select("generated_at, payload").order("generated_at", { ascending: false }).limit(1);
  if (error) throw new ApiError(500, error.message);
  if (!data || data.length === 0) return null;
  return data[0] as { generated_at: string; payload: ForecastPayload };
}

function cacheAgeHours(generatedAt: string): number {
  return (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60);
}

function withFreshness(generatedAt: string, payload: ForecastPayload): ForecastResponse {
  const canRegenerate = cacheAgeHours(generatedAt) >= CACHE_FRESHNESS_HOURS;
  return {
    ...payload,
    generated_at: generatedAt,
    can_regenerate: canRegenerate,
    next_regeneration_at: canRegenerate ? null : new Date(new Date(generatedAt).getTime() + CACHE_FRESHNESS_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

/** GET path: returns the latest cache as-is (generating once if none exists yet); never silently re-spends a Gemini call on a stale cache. */
export async function getForecast(db: SupabaseClient): Promise<ForecastResponse> {
  const cached = await getLatestCache(db);
  if (cached) return withFreshness(cached.generated_at, cached.payload);
  return regenerateForecast(db);
}

/** POST path: explicit regenerate — only allowed once the cache is missing or at least 24h old. */
export async function regenerateForecast(db: SupabaseClient): Promise<ForecastResponse> {
  const cached = await getLatestCache(db);
  if (cached && cacheAgeHours(cached.generated_at) < CACHE_FRESHNESS_HOURS) {
    const nextAt = new Date(new Date(cached.generated_at).getTime() + CACHE_FRESHNESS_HOURS * 60 * 60 * 1000);
    throw new BadRequestError(`The forecast can only be regenerated once every 24 hours. Next available at ${nextAt.toISOString()}.`);
  }

  const stats = await computeItemStats(db);
  const aiResults = env.geminiConfigured && stats.length > 0 ? await callGeminiForForecast(stats) : null;

  const items: ForecastItemResult[] = stats.map((stat) => {
    const ai = aiResults?.get(stat.item_id);
    const prediction = ai ?? fallbackPredictionFor(stat);
    const confidence: Confidence = stat.days_of_history < 21 ? "low" : prediction.confidence;

    return {
      item_id: stat.item_id,
      item_name: stat.item_name,
      unit: stat.unit,
      predicted_quantity: prediction.predicted_quantity,
      predicted_spend: prediction.predicted_spend,
      predicted_stockout_date: stockoutDateFor(stat),
      confidence,
      reasoning: prediction.reasoning,
    };
  });

  const payload: ForecastPayload = { generated_by: aiResults ? "ai" : "fallback", items };
  const generatedAt = new Date().toISOString();

  const { error } = await db.from("forecasts_cache").insert({ generated_at: generatedAt, payload });
  if (error) console.error("Failed to cache forecast:", error.message);

  await raiseStockoutRemindersIfNeeded(db, items);

  return withFreshness(generatedAt, payload);
}
