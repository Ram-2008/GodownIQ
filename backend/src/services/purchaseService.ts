import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, ForbiddenError, NotFoundError } from "../middleware/errors";
import { AuthenticatedProfile } from "../types/express";
import { Purchase } from "../types/domain";
import { CreatePurchaseInput, UpdatePurchaseInput } from "../validation/purchases";
import { findOrCreateItem, getItemById } from "./itemsService";
import { findOrCreateSupplier } from "./suppliersService";
import { recordStockMovement } from "./stockService";
import { writeAuditLog } from "./auditService";
import { checkLowStock, checkPriceAnomaly } from "./alertService";

export interface PurchaseWithNames extends Purchase {
  item_name: string;
  supplier_name: string | null;
}

const SELECT_WITH_NAMES = "*, items(name), suppliers(name)";

function flattenNames(row: any): PurchaseWithNames {
  const { items, suppliers, ...rest } = row;
  return { ...rest, item_name: items?.name ?? "Unknown item", supplier_name: suppliers?.name ?? null };
}

export async function listPurchases(
  db: SupabaseClient,
  filters: { from?: string; to?: string; itemId?: string; page: number; pageSize: number }
): Promise<{ purchases: PurchaseWithNames[]; total: number }> {
  let query = db
    .from("purchases")
    .select(SELECT_WITH_NAMES, { count: "exact" })
    .is("deleted_at", null)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("purchase_date", filters.from);
  if (filters.to) query = query.lte("purchase_date", filters.to);
  if (filters.itemId) query = query.eq("item_id", filters.itemId);

  const start = (filters.page - 1) * filters.pageSize;
  query = query.range(start, start + filters.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, error.message);
  return { purchases: (data ?? []).map(flattenNames), total: count ?? 0 };
}

export async function getPurchaseById(db: SupabaseClient, id: string): Promise<PurchaseWithNames> {
  const { data, error } = await db.from("purchases").select(SELECT_WITH_NAMES).eq("id", id).is("deleted_at", null).single();
  if (error || !data) throw new NotFoundError("Purchase not found.");
  return flattenNames(data);
}

function isSameUtcDay(isoTimestamp: string): boolean {
  return isoTimestamp.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function canModifyPurchase(profile: AuthenticatedProfile, purchase: { created_by: string; created_at: string }): boolean {
  if (profile.role === "owner") return true;
  return purchase.created_by === profile.id && isSameUtcDay(purchase.created_at);
}

export function assertCanModify(profile: AuthenticatedProfile, purchase: { created_by: string; created_at: string }) {
  if (profile.role === "owner") return;
  if (purchase.created_by !== profile.id) {
    throw new ForbiddenError("You can only edit or delete your own entries.");
  }
  if (!isSameUtcDay(purchase.created_at)) {
    throw new ForbiddenError("You can only edit or delete entries you made today. Ask the owner to change this one.");
  }
}

export async function createPurchase(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  input: CreatePurchaseInput
): Promise<PurchaseWithNames> {
  const item = input.item_id
    ? await getItemById(db, input.item_id)
    : await findOrCreateItem(db, input.item_name!, input.default_unit_for_new_item ?? input.unit);

  const supplierId = input.supplier_id
    ? input.supplier_id
    : input.supplier_name
    ? (await findOrCreateSupplier(db, input.supplier_name)).id
    : null;

  const { data, error } = await db
    .from("purchases")
    .insert({
      item_id: item.id,
      quantity: input.quantity,
      unit: input.unit,
      unit_price: input.unit_price,
      total_amount: input.total_amount,
      purchase_date: input.purchase_date,
      supplier_id: supplierId,
      invoice_number: input.invoice_number ?? null,
      gst_amount: input.gst_amount ?? null,
      payment_status: input.payment_status,
      payment_due_date: input.payment_status === "pending" ? input.payment_due_date ?? null : null,
      note: input.note ?? null,
      entry_source: input.entry_source,
      created_by: profile.id,
    })
    .select(SELECT_WITH_NAMES)
    .single();

  if (error || !data) throw new ApiError(500, "Could not save the purchase: " + (error?.message ?? "unknown error"));
  const purchase = flattenNames(data);

  if (item.track_stock) {
    await recordStockMovement(db, {
      itemId: item.id,
      type: "in",
      quantity: input.quantity,
      movementDate: input.purchase_date,
      createdBy: profile.id,
      purchaseId: purchase.id,
    });
    const updatedItem = await getItemById(db, item.id);
    await checkLowStock(db, updatedItem, updatedItem.current_stock ?? 0);
  }

  await checkPriceAnomaly(db, item, input.unit_price, purchase.id);

  await writeAuditLog(db, {
    purchaseId: purchase.id,
    action: "create",
    changedBy: profile.id,
    newValues: purchase,
  });

  return purchase;
}

export async function updatePurchase(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  id: string,
  input: UpdatePurchaseInput
): Promise<PurchaseWithNames> {
  const existing = await getPurchaseById(db, id);
  assertCanModify(profile, existing);

  const patch: Record<string, unknown> = { ...input };
  if (input.payment_status === "paid") patch.payment_due_date = null;

  const { data, error } = await db.from("purchases").update(patch).eq("id", id).select(SELECT_WITH_NAMES).single();
  if (error || !data) throw new ApiError(500, "Could not update the purchase: " + (error?.message ?? "unknown error"));
  const updated = flattenNames(data);

  await writeAuditLog(db, {
    purchaseId: id,
    action: "update",
    changedBy: profile.id,
    oldValues: existing,
    newValues: updated,
  });

  return updated;
}

export async function softDeletePurchase(db: SupabaseClient, profile: AuthenticatedProfile, id: string): Promise<void> {
  const existing = await getPurchaseById(db, id);
  assertCanModify(profile, existing);

  const { error } = await db.from("purchases").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new ApiError(500, "Could not delete the purchase: " + error.message);

  await writeAuditLog(db, {
    purchaseId: id,
    action: "delete",
    changedBy: profile.id,
    oldValues: existing,
  });
}

export async function markPurchasePaid(db: SupabaseClient, profile: AuthenticatedProfile, id: string): Promise<PurchaseWithNames> {
  const existing = await getPurchaseById(db, id);

  const { data, error } = await db
    .from("purchases")
    .update({ payment_status: "paid", payment_due_date: null })
    .eq("id", id)
    .select(SELECT_WITH_NAMES)
    .single();
  if (error || !data) throw new ApiError(500, "Could not mark this purchase paid: " + (error?.message ?? "unknown error"));
  const updated = flattenNames(data);

  await writeAuditLog(db, {
    purchaseId: id,
    action: "payment_marked_paid",
    changedBy: profile.id,
    oldValues: { payment_status: existing.payment_status, payment_due_date: existing.payment_due_date },
    newValues: { payment_status: "paid", payment_due_date: null },
  });

  return updated;
}
