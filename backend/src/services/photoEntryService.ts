import { SupabaseClient } from "@supabase/supabase-js";
import { AuthenticatedProfile } from "../types/express";
import { SavePhotoEntryInput } from "../validation/photoEntry";
import { createPurchase, PurchaseWithNames } from "./purchaseService";

/**
 * A photo bill's GST is a single bill-level figure, but each line item becomes its
 * own purchase row. Split it proportionally by each line's share of the bill total
 * so both per-item and month-aggregate GST reporting stay meaningful; any rounding
 * remainder is absorbed into the last line so the parts sum exactly to the whole.
 */
export async function saveConfirmedPhotoEntries(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  input: SavePhotoEntryInput
): Promise<PurchaseWithNames[]> {
  const billTotal = input.line_items.reduce((sum, li) => sum + li.total_amount, 0);
  const results: PurchaseWithNames[] = [];
  let allocatedGst = 0;

  for (let i = 0; i < input.line_items.length; i++) {
    const li = input.line_items[i];

    let lineGst: number | undefined;
    if (input.gst_amount != null && billTotal > 0) {
      if (i === input.line_items.length - 1) {
        lineGst = Number((input.gst_amount - allocatedGst).toFixed(2));
      } else {
        lineGst = Number((input.gst_amount * (li.total_amount / billTotal)).toFixed(2));
        allocatedGst += lineGst;
      }
    }

    const purchase = await createPurchase(db, profile, {
      item_name: li.item_name,
      default_unit_for_new_item: li.unit,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unit_price,
      total_amount: li.total_amount,
      purchase_date: input.purchase_date,
      supplier_name: input.supplier_name,
      invoice_number: input.invoice_number,
      gst_amount: lineGst,
      payment_status: "paid",
      entry_source: "photo",
    });
    results.push(purchase);
  }

  return results;
}
