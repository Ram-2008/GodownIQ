import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { expensesApi } from "../api/expenses";
import { EXPENSE_CATEGORIES, Expense, ExpenseCategory } from "../types/domain";
import { formatINR } from "../utils/currency";
import { formatDDMMYYYY, todayISO } from "../utils/date";

const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  salaries: "Salaries",
  utilities: "Utilities",
  maintenance: "Maintenance",
  transport: "Transport",
  other: "Other",
};

export function ExpensesPage() {
  const { show } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    expensesApi
      .list({ page, page_size: PAGE_SIZE })
      .then((res) => {
        setExpenses(res.expenses);
        setTotal(res.total);
      })
      .catch(() => show("Could not load expenses.", "error"))
      .finally(() => setLoading(false));
  }, [page, show]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await expensesApi.create({
        category: category as ExpenseCategory,
        description: description.trim(),
        amount: parseFloat(amount),
        expense_date: expenseDate,
        payment_status: paymentStatus,
        payment_due_date: paymentStatus === "pending" && paymentDueDate ? paymentDueDate : undefined,
        note: note.trim() || undefined,
      });
      show("Expense recorded.", "success");
      setCategory("");
      setDescription("");
      setAmount("");
      setNote("");
      setPaymentStatus("paid");
      setPaymentDueDate("");
      setPage(1);
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not save this expense.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Expenses</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Add expense</h2>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select category…</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <Input label="Amount (₹)" type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <Input label="Description" required value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Date" type="date" required max={todayISO()} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">Payment</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${paymentStatus === "paid" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"}`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus("pending")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${paymentStatus === "pending" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"}`}
            >
              Pending
            </button>
          </div>
          {paymentStatus === "pending" && (
            <Input label="Due date" type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} />
          )}
        </div>

        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

        <Button type="submit" loading={submitting} disabled={!category}>
          Save expense
        </Button>
      </form>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">No expenses recorded yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 text-gray-500">{formatDDMMYYYY(e.expense_date)}</td>
                  <td className="px-3 py-2 text-gray-600">{CATEGORY_LABELS[e.category]}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{e.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{formatINR(e.amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.payment_status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {e.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-xs text-gray-400">
          Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} expenses
        </span>
        <Button variant="secondary" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
