import { SupabaseClient } from "@supabase/supabase-js";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { formatINR } from "../utils/format";
import { Item } from "../types/domain";
import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";
import { sendWhatsappMessage } from "./twilioService";

const ANOMALY_THRESHOLD_PCT = 15;
const ANOMALY_WINDOW_DAYS = 90;

// Alert types that are urgent/actionable enough to push outbound, beyond the in-app panel.
const OUTBOUND_ALERT_TYPES = new Set(["low_stock", "payment_overdue"]);

export function shouldNotifyOutbound(type: string): boolean {
  return OUTBOUND_ALERT_TYPES.has(type);
}

/** Best-effort outbound push to every owner with a WhatsApp number on file. Never throws. */
async function notifyOwnersByWhatsapp(message: string): Promise<void> {
  if (!env.twilioConfigured) return;
  const { data, error } = await supabaseAdmin.from("profiles").select("whatsapp_number").eq("role", "owner").not("whatsapp_number", "is", null);
  if (error) {
    console.error("Failed to look up owner WhatsApp numbers for outbound alert:", error.message);
    return;
  }
  for (const row of (data ?? []) as { whatsapp_number: string | null }[]) {
    if (!row.whatsapp_number) continue;
    try {
      await sendWhatsappMessage(row.whatsapp_number, `GodownIQ alert: ${message}`);
    } catch (err) {
      console.error("Failed to send outbound WhatsApp alert:", err);
    }
  }
}

export function computeAnomalyPct(unitPrice: number, avgPrice: number): number {
  if (avgPrice <= 0) return 0;
  return ((unitPrice - avgPrice) / avgPrice) * 100;
}

// Alerts are system-generated, not authored by the requesting user — staff have no
// INSERT grant on the alerts table (RLS), so alert writes always go through the
// service-role client regardless of which client was used to read the triggering data.
export async function createAlert(
  type: "price_anomaly" | "low_stock" | "payment_overdue" | "reorder_reminder",
  message: string,
  relatedId: string | null
): Promise<void> {
  const { error } = await supabaseAdmin.from("alerts").insert({ type, message, related_id: relatedId });
  if (error) {
    console.error(`Failed to create ${type} alert:`, error.message);
    return;
  }
  if (shouldNotifyOutbound(type)) await notifyOwnersByWhatsapp(message);
}

export async function hasActiveAlert(db: SupabaseClient, type: string, relatedId: string): Promise<boolean> {
  const { data, error } = await db
    .from("alerts")
    .select("id")
    .eq("type", type)
    .eq("related_id", relatedId)
    .is("dismissed_at", null)
    .limit(1);
  if (error) {
    console.error("Failed to check for existing alert:", error.message);
    return true; // fail closed — better a missed alert than a duplicate spam loop
  }
  return (data ?? []).length > 0;
}

/** Called right after a purchase is saved. Compares against the item's trailing 90-day average. */
export async function checkPriceAnomaly(db: SupabaseClient, item: Item, unitPrice: number, purchaseId: string): Promise<void> {
  const since = format(subDays(new Date(), ANOMALY_WINDOW_DAYS), "yyyy-MM-dd");
  const { data, error } = await db
    .from("purchases")
    .select("unit_price")
    .eq("item_id", item.id)
    .is("deleted_at", null)
    .gte("purchase_date", since);
  if (error) {
    console.error("Failed to fetch purchase history for anomaly check:", error.message);
    return;
  }

  const priorPrices = ((data ?? []) as { unit_price: number }[]).map((r) => r.unit_price);
  if (priorPrices.length < 3) return; // not enough history for a meaningful average

  const avg = priorPrices.reduce((sum, p) => sum + p, 0) / priorPrices.length;
  const pct = computeAnomalyPct(unitPrice, avg);
  if (pct <= ANOMALY_THRESHOLD_PCT) return;

  await createAlert(
    "price_anomaly",
    `${item.name} at ${formatINR(unitPrice)}/${item.default_unit} is ${pct.toFixed(0)}% above your ${formatINR(avg)} average`,
    purchaseId
  );
}

/** Called right after a stock movement is recorded. Raises or auto-clears the low-stock alert for the item. */
export async function checkLowStock(db: SupabaseClient, item: Item, currentStock: number): Promise<void> {
  if (item.low_stock_threshold == null) return;

  if (currentStock < item.low_stock_threshold) {
    const alreadyAlerted = await hasActiveAlert(db, "low_stock", item.id);
    if (!alreadyAlerted) {
      await createAlert(
        "low_stock",
        `${item.name} is low: ${currentStock} ${item.default_unit} left (threshold ${item.low_stock_threshold})`,
        item.id
      );
    }
  } else {
    // Stock has recovered above threshold — clear any stale alert so the panel stays accurate.
    await supabaseAdmin
      .from("alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("type", "low_stock")
      .eq("related_id", item.id)
      .is("dismissed_at", null);
  }
}

/** Daily job (service-role): pending purchases whose due date has passed. */
export async function checkOverduePayments(db: SupabaseClient): Promise<void> {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error } = await db
    .from("purchases")
    .select("id, total_amount, payment_due_date, items(name), suppliers(name)")
    .eq("payment_status", "pending")
    .is("deleted_at", null)
    .lt("payment_due_date", today);
  if (error) {
    console.error("Failed to fetch overdue payments:", error.message);
    return;
  }

  for (const row of (data ?? []) as any[]) {
    const alreadyAlerted = await hasActiveAlert(db, "payment_overdue", row.id);
    if (alreadyAlerted) continue;
    const supplierPart = row.suppliers?.name ? ` from ${row.suppliers.name}` : "";
    await createAlert(
      "payment_overdue",
      `Payment of ${formatINR(row.total_amount)} for ${row.items?.name ?? "an item"}${supplierPart} was due ${row.payment_due_date} and is still pending`,
      row.id
    );
  }
}

const MIN_PURCHASES_FOR_CADENCE = 5;
const CADENCE_TOLERANCE_DAYS = 2;

export function detectCadence(purchaseDatesAscending: string[]): { avgIntervalDays: number; isConsistent: boolean } | null {
  if (purchaseDatesAscending.length < MIN_PURCHASES_FOR_CADENCE) return null;

  const recent = purchaseDatesAscending.slice(-MIN_PURCHASES_FOR_CADENCE);
  const intervals: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    intervals.push(differenceInCalendarDays(new Date(recent[i]), new Date(recent[i - 1])));
  }
  const avg = intervals.reduce((sum, d) => sum + d, 0) / intervals.length;
  const isConsistent = intervals.every((d) => Math.abs(d - avg) <= CADENCE_TOLERANCE_DAYS);

  return { avgIntervalDays: avg, isConsistent };
}

/** Daily job (service-role): items bought on a regular cadence that are now "overdue" for a reorder. */
export async function checkRecurringReminders(db: SupabaseClient): Promise<void> {
  const { data: items, error: itemsError } = await db.from("items").select("id, name");
  if (itemsError) {
    console.error("Failed to fetch items for recurring reminder check:", itemsError.message);
    return;
  }

  for (const item of (items ?? []) as { id: string; name: string }[]) {
    const { data, error } = await db
      .from("purchases")
      .select("purchase_date")
      .eq("item_id", item.id)
      .is("deleted_at", null)
      .order("purchase_date", { ascending: true });
    if (error) continue;

    const dates = (data ?? []).map((r: { purchase_date: string }) => r.purchase_date);
    const cadence = detectCadence(dates);
    if (!cadence || !cadence.isConsistent) continue;

    const lastPurchaseDate = dates[dates.length - 1];
    const daysSinceLast = differenceInCalendarDays(new Date(), new Date(lastPurchaseDate));
    if (daysSinceLast <= cadence.avgIntervalDays + CADENCE_TOLERANCE_DAYS) continue;

    const alreadyAlerted = await hasActiveAlert(db, "reorder_reminder", item.id);
    if (alreadyAlerted) continue;

    await createAlert(
      "reorder_reminder",
      `You usually buy ${item.name} every ${Math.round(cadence.avgIntervalDays)} days — last purchase was ${daysSinceLast} days ago`,
      item.id
    );
  }
}

export async function runDailyAlertChecks(db: SupabaseClient): Promise<void> {
  await checkOverduePayments(db);
  await checkRecurringReminders(db);
}
