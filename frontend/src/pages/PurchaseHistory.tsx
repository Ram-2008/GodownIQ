import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PurchaseEditModal } from "../components/PurchaseEditModal";
import { purchasesApi } from "../api/purchases";
import { Purchase } from "../types/domain";
import { formatINR } from "../utils/currency";
import { formatDDMMYYYY } from "../utils/date";

const PAGE_SIZE = 25;

export function PurchaseHistoryPage() {
  const { show } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Purchase | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    purchasesApi
      .list({ q: q || undefined, from: from || undefined, to: to || undefined, page, page_size: PAGE_SIZE })
      .then((res) => {
        setPurchases(res.purchases);
        setTotal(res.total);
      })
      .catch(() => show("Could not load purchases.", "error"))
      .finally(() => setLoading(false));
  }, [q, from, to, page, show]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">Purchase History</h1>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Item, supplier, invoice number, note…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : purchases.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          No purchases found{q ? ` for "${q}"` : ""}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-500">{formatDDMMYYYY(p.purchase_date)}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{p.item_name}</td>
                  <td className="px-3 py-2 text-gray-600">{p.supplier_name ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.quantity} {p.unit}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{formatINR(p.total_amount)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.payment_status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {p.payment_status}
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
          Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} purchases
        </span>
        <Button variant="secondary" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      {selected && (
        <PurchaseEditModal
          purchase={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            load();
          }}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
