import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, BadRequestError } from "../middleware/errors";
import { Item, Unit } from "../types/domain";

export async function listItems(db: SupabaseClient, q?: string): Promise<Item[]> {
  let query = db.from("items").select("*").order("name");
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "\\$&")}%`);
  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  return data as Item[];
}

export async function findItemByName(db: SupabaseClient, name: string): Promise<Item | null> {
  const { data, error } = await db.from("items").select("*").ilike("name", name.trim()).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return (data as Item) ?? null;
}

export async function createItem(db: SupabaseClient, name: string, defaultUnit: Unit): Promise<Item> {
  const { data, error } = await db
    .from("items")
    .insert({ name: name.trim(), default_unit: defaultUnit })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new BadRequestError("An item with this name already exists.");
    throw new ApiError(500, error.message);
  }
  return data as Item;
}

/** Looks up an item by name (case-insensitive), creating it if it doesn't exist yet. */
export async function findOrCreateItem(db: SupabaseClient, name: string, defaultUnit: Unit): Promise<Item> {
  const existing = await findItemByName(db, name);
  if (existing) return existing;
  try {
    return await createItem(db, name, defaultUnit);
  } catch (err) {
    // Race: another request created it between our lookup and insert — fetch it.
    const retry = await findItemByName(db, name);
    if (retry) return retry;
    throw err;
  }
}

export async function getItemById(db: SupabaseClient, id: string): Promise<Item> {
  const { data, error } = await db.from("items").select("*").eq("id", id).single();
  if (error || !data) throw new BadRequestError("Item not found.");
  return data as Item;
}
