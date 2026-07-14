import { api } from "./client";
import { Expense, ExpenseCategory, PaymentStatus } from "../types/domain";

export interface CreateExpensePayload {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_status: PaymentStatus;
  payment_due_date?: string;
  note?: string;
}

export interface UpdateExpensePayload {
  category?: ExpenseCategory;
  description?: string;
  amount?: number;
  expense_date?: string;
  payment_status?: PaymentStatus;
  payment_due_date?: string | null;
  note?: string | null;
}

export interface ListExpensesParams {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  q?: string;
  page?: number;
  page_size?: number;
}

function toQueryString(params: ListExpensesParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const expensesApi = {
  list: (params: ListExpensesParams = {}) =>
    api.get<{ expenses: Expense[]; total: number }>(`/expenses${toQueryString(params)}`),
  get: (id: string) => api.get<{ expense: Expense }>(`/expenses/${id}`).then((r) => r.expense),
  create: (payload: CreateExpensePayload) => api.post<{ expense: Expense }>("/expenses", payload).then((r) => r.expense),
  update: (id: string, payload: UpdateExpensePayload) =>
    api.patch<{ expense: Expense }>(`/expenses/${id}`, payload).then((r) => r.expense),
  remove: (id: string) => api.delete<void>(`/expenses/${id}`),
  markPaid: (id: string) => api.post<{ expense: Expense }>(`/expenses/${id}/mark-paid`).then((r) => r.expense),
};
