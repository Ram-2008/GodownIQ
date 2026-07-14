import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, ForbiddenError, NotFoundError } from "../middleware/errors";
import { AuthenticatedProfile } from "../types/express";
import { Expense } from "../types/domain";
import { CreateExpenseInput, UpdateExpenseInput } from "../validation/expenses";
import { writeExpenseAuditLog } from "./expenseAuditService";

export async function listExpenses(
  db: SupabaseClient,
  filters: { from?: string; to?: string; category?: string; q?: string; page: number; pageSize: number }
): Promise<{ expenses: Expense[]; total: number }> {
  let query = db
    .from("expenses")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.from) query = query.gte("expense_date", filters.from);
  if (filters.to) query = query.lte("expense_date", filters.to);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_]/g, "\\$&")}%`;
    query = query.or(`description.ilike.${like},note.ilike.${like}`);
  }

  const start = (filters.page - 1) * filters.pageSize;
  query = query.range(start, start + filters.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, error.message);
  return { expenses: (data ?? []) as Expense[], total: count ?? 0 };
}

export async function getExpenseById(db: SupabaseClient, id: string): Promise<Expense> {
  const { data, error } = await db.from("expenses").select("*").eq("id", id).is("deleted_at", null).single();
  if (error || !data) throw new NotFoundError("Expense not found.");
  return data as Expense;
}

function isSameUtcDay(isoTimestamp: string): boolean {
  return isoTimestamp.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function assertCanModify(profile: AuthenticatedProfile, expense: { created_by: string; created_at: string }) {
  if (profile.role === "owner") return;
  if (expense.created_by !== profile.id) {
    throw new ForbiddenError("You can only edit or delete your own entries.");
  }
  if (!isSameUtcDay(expense.created_at)) {
    throw new ForbiddenError("You can only edit or delete entries you made today. Ask the owner to change this one.");
  }
}

export async function createExpense(db: SupabaseClient, profile: AuthenticatedProfile, input: CreateExpenseInput): Promise<Expense> {
  const { data, error } = await db
    .from("expenses")
    .insert({
      category: input.category,
      description: input.description,
      amount: input.amount,
      expense_date: input.expense_date,
      payment_status: input.payment_status,
      payment_due_date: input.payment_status === "pending" ? input.payment_due_date ?? null : null,
      note: input.note ?? null,
      created_by: profile.id,
    })
    .select("*")
    .single();

  if (error || !data) throw new ApiError(500, "Could not save the expense: " + (error?.message ?? "unknown error"));
  const expense = data as Expense;

  await writeExpenseAuditLog(db, { expenseId: expense.id, action: "create", changedBy: profile.id, newValues: expense });

  return expense;
}

export async function updateExpense(
  db: SupabaseClient,
  profile: AuthenticatedProfile,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense> {
  const existing = await getExpenseById(db, id);
  assertCanModify(profile, existing);

  const patch: Record<string, unknown> = { ...input };
  if (input.payment_status === "paid") patch.payment_due_date = null;

  const { data, error } = await db.from("expenses").update(patch).eq("id", id).select("*").single();
  if (error || !data) throw new ApiError(500, "Could not update the expense: " + (error?.message ?? "unknown error"));
  const updated = data as Expense;

  await writeExpenseAuditLog(db, { expenseId: id, action: "update", changedBy: profile.id, oldValues: existing, newValues: updated });

  return updated;
}

export async function softDeleteExpense(db: SupabaseClient, profile: AuthenticatedProfile, id: string): Promise<void> {
  const existing = await getExpenseById(db, id);
  assertCanModify(profile, existing);

  const { error } = await db.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new ApiError(500, "Could not delete the expense: " + error.message);

  await writeExpenseAuditLog(db, { expenseId: id, action: "delete", changedBy: profile.id, oldValues: existing });
}

export async function markExpensePaid(db: SupabaseClient, profile: AuthenticatedProfile, id: string): Promise<Expense> {
  const existing = await getExpenseById(db, id);

  const { data, error } = await db
    .from("expenses")
    .update({ payment_status: "paid", payment_due_date: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new ApiError(500, "Could not mark this expense paid: " + (error?.message ?? "unknown error"));
  const updated = data as Expense;

  await writeExpenseAuditLog(db, {
    expenseId: id,
    action: "payment_marked_paid",
    changedBy: profile.id,
    oldValues: { payment_status: existing.payment_status, payment_due_date: existing.payment_due_date },
    newValues: { payment_status: "paid", payment_due_date: null },
  });

  return updated;
}
