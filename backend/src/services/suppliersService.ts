import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, BadRequestError } from "../middleware/errors";
import { Supplier } from "../types/domain";

export async function listSuppliers(db: SupabaseClient, q?: string): Promise<Supplier[]> {
  let query = db.from("suppliers").select("*").order("name");
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "\\$&")}%`);
  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);
  return data as Supplier[];
}

export async function findSupplierByName(db: SupabaseClient, name: string): Promise<Supplier | null> {
  const { data, error } = await db.from("suppliers").select("*").ilike("name", name.trim()).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return (data as Supplier) ?? null;
}

export async function createSupplier(db: SupabaseClient, name: string, phone?: string): Promise<Supplier> {
  const { data, error } = await db
    .from("suppliers")
    .insert({ name: name.trim(), phone: phone ?? null })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new BadRequestError("A supplier with this name already exists.");
    throw new ApiError(500, error.message);
  }
  return data as Supplier;
}

export async function findOrCreateSupplier(db: SupabaseClient, name: string): Promise<Supplier> {
  const existing = await findSupplierByName(db, name);
  if (existing) return existing;
  try {
    return await createSupplier(db, name);
  } catch (err) {
    const retry = await findSupplierByName(db, name);
    if (retry) return retry;
    throw err;
  }
}
