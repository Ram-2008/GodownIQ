import { SupabaseClient } from "@supabase/supabase-js";
import { endOfMonth, format } from "date-fns";
import { ApiError } from "../middleware/errors";
import { buildCsv } from "../utils/csv";
import { formatDDMMYYYY, formatINR } from "../utils/format";

export interface MonthlyReport {
  total_spend: number;
  gst_total: number;
  pending_amount: number;
  per_item: { item_id: string; item_name: string; quantity: number; avg_price: number; total: number }[];
  per_supplier: { supplier_id: string | null; supplier_name: string; total: number }[];
  expenses_total: number;
  per_category: { category: string; total: number }[];
}

type ReportRow = {
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  gst_amount: number | null;
  payment_status: "paid" | "pending";
  supplier_id: string | null;
  items: { name: string } | null;
  suppliers: { name: string } | null;
};

export async function getMonthlyReport(db: SupabaseClient, year: number, month: number): Promise<MonthlyReport> {
  const monthStartDate = new Date(year, month - 1, 1);
  const monthStart = format(monthStartDate, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(monthStartDate), "yyyy-MM-dd");

  const { data, error } = await db
    .from("purchases")
    .select("item_id, quantity, unit_price, total_amount, gst_amount, payment_status, supplier_id, items(name), suppliers(name)")
    .is("deleted_at", null)
    .gte("purchase_date", monthStart)
    .lte("purchase_date", monthEnd);
  if (error) throw new ApiError(500, error.message);

  const rows = (data ?? []) as unknown as ReportRow[];

  let totalSpend = 0;
  let gstTotal = 0;
  let pendingAmount = 0;
  const perItem = new Map<string, { name: string; quantity: number; total: number }>();
  const perSupplier = new Map<string, { name: string; total: number }>();

  for (const r of rows) {
    totalSpend += r.total_amount;
    gstTotal += r.gst_amount ?? 0;
    if (r.payment_status === "pending") pendingAmount += r.total_amount;

    const itemEntry = perItem.get(r.item_id) ?? { name: r.items?.name ?? "Unknown item", quantity: 0, total: 0 };
    itemEntry.quantity += r.quantity;
    itemEntry.total += r.total_amount;
    perItem.set(r.item_id, itemEntry);

    const supplierKey = r.supplier_id ?? "none";
    const supplierEntry = perSupplier.get(supplierKey) ?? { name: r.suppliers?.name ?? "No supplier", total: 0 };
    supplierEntry.total += r.total_amount;
    perSupplier.set(supplierKey, supplierEntry);
  }

  const { data: expenseData, error: expenseError } = await db
    .from("expenses")
    .select("category, amount")
    .is("deleted_at", null)
    .gte("expense_date", monthStart)
    .lte("expense_date", monthEnd);
  if (expenseError) throw new ApiError(500, expenseError.message);

  let expensesTotal = 0;
  const perCategory = new Map<string, number>();
  for (const e of (expenseData ?? []) as { category: string; amount: number }[]) {
    expensesTotal += e.amount;
    perCategory.set(e.category, (perCategory.get(e.category) ?? 0) + e.amount);
  }

  return {
    total_spend: totalSpend,
    gst_total: gstTotal,
    pending_amount: pendingAmount,
    per_item: [...perItem.entries()]
      .map(([item_id, v]) => ({ item_id, item_name: v.name, quantity: v.quantity, avg_price: v.quantity > 0 ? v.total / v.quantity : 0, total: v.total }))
      .sort((a, b) => b.total - a.total),
    per_supplier: [...perSupplier.entries()]
      .map(([supplier_id, v]) => ({ supplier_id: supplier_id === "none" ? null : supplier_id, supplier_name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total),
    expenses_total: expensesTotal,
    per_category: [...perCategory.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
  };
}

const PURCHASE_CSV_HEADERS = [
  "Date",
  "Item",
  "Quantity",
  "Unit",
  "Unit Price",
  "Total Amount",
  "Supplier",
  "Invoice Number",
  "GST Amount",
  "Payment Status",
  "Payment Due Date",
  "Entry Source",
  "Created By",
  "Note",
];

export async function exportPurchasesCsv(db: SupabaseClient, range?: { from: string; to: string }): Promise<string> {
  let query = db
    .from("purchases")
    .select(
      "purchase_date, quantity, unit, unit_price, total_amount, invoice_number, gst_amount, payment_status, payment_due_date, entry_source, note, items(name), suppliers(name), profiles(full_name)"
    )
    .is("deleted_at", null)
    .order("purchase_date", { ascending: true });

  if (range) query = query.gte("purchase_date", range.from).lte("purchase_date", range.to);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);

  const rows = (data ?? []).map((r: any) => [
    formatDDMMYYYY(r.purchase_date),
    r.items?.name ?? "",
    r.quantity,
    r.unit,
    formatINR(r.unit_price),
    formatINR(r.total_amount),
    r.suppliers?.name ?? "",
    r.invoice_number ?? "",
    formatINR(r.gst_amount),
    r.payment_status,
    formatDDMMYYYY(r.payment_due_date),
    r.entry_source,
    r.profiles?.full_name ?? "",
    r.note ?? "",
  ]);

  return buildCsv(PURCHASE_CSV_HEADERS, rows);
}

const EXPENSE_CSV_HEADERS = ["Date", "Category", "Description", "Amount", "Payment Status", "Payment Due Date", "Created By", "Note"];

export async function exportExpensesCsv(db: SupabaseClient, range?: { from: string; to: string }): Promise<string> {
  let query = db
    .from("expenses")
    .select("expense_date, category, description, amount, payment_status, payment_due_date, note, profiles(full_name)")
    .is("deleted_at", null)
    .order("expense_date", { ascending: true });

  if (range) query = query.gte("expense_date", range.from).lte("expense_date", range.to);

  const { data, error } = await query;
  if (error) throw new ApiError(500, error.message);

  const rows = (data ?? []).map((r: any) => [
    formatDDMMYYYY(r.expense_date),
    r.category,
    r.description,
    formatINR(r.amount),
    r.payment_status,
    formatDDMMYYYY(r.payment_due_date),
    r.profiles?.full_name ?? "",
    r.note ?? "",
  ]);

  return buildCsv(EXPENSE_CSV_HEADERS, rows);
}

const STOCK_MOVEMENT_CSV_HEADERS = ["Date", "Item", "Type", "Quantity", "Note", "Created By"];

export async function exportStockMovementsCsv(db: SupabaseClient): Promise<string> {
  const { data, error } = await db
    .from("stock_movements")
    .select("movement_date, type, quantity, note, items(name), profiles(full_name)")
    .order("movement_date", { ascending: true });
  if (error) throw new ApiError(500, error.message);

  const rows = (data ?? []).map((r: any) => [
    formatDDMMYYYY(r.movement_date),
    r.items?.name ?? "",
    r.type,
    r.quantity,
    r.note ?? "",
    r.profiles?.full_name ?? "",
  ]);

  return buildCsv(STOCK_MOVEMENT_CSV_HEADERS, rows);
}
