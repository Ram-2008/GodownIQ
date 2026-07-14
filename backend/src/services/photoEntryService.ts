import { randomUUID } from "node:crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { AuthenticatedProfile } from "../types/express";
import { SavePhotoEntryInput } from "../validation/photoEntry";
import { createPurchase, PurchaseWithNames } from "./purchaseService";

const MEDIA_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads the reviewed bill photo to Storage so it can be viewed later against
 * the purchases it produced. Non-fatal: if the upload fails, the confirmed line
 * items should still be saved as purchases, just without a bill photo attached.
 */
async function uploadBillPhoto(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  imageBase64: string,
  mediaType: string
): Promise<string | undefined> {
  try {
    const ext = MEDIA_TYPE_EXT[mediaType] ?? "jpg";
    const path = `${profile.id}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(imageBase64, "base64");
    const { error } = await db.storage.from("bill-photos").upload(path, buffer, { contentType: mediaType });
    if (error) {
      console.error("Bill photo upload failed:", error.message);
      return undefined;
    }
    return path;
  } catch (err) {
    console.error("Bill photo upload failed:", err);
    return undefined;
  }
}

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

  const billImagePath =
    input.image_base64 && input.media_type ? await uploadBillPhoto(db, profile, input.image_base64, input.media_type) : undefined;

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

    const purchase = await createPurchase(
      db,
      profile,
      {
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
      },
      { billImagePath }
    );
    results.push(purchase);
  }

  return results;
}
