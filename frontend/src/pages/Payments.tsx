import { useCallback, useEffect, useState } from "react";
import { paymentsApi, PendingPaymentsSummary } from "../api/payments";
import { purchasesApi } from "../api/purchases";
import { useToast } from "../components/Toast";
import { StatCard } from "../components/ui/StatCard";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatINR } from "../utils/currency";
import { formatDDMMYYYY } from "../utils/date";

export function PaymentsPage() {
  const { show } = useToast();
  const [summary, setSummary] = useState<PendingPaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    paymentsApi
      .summary()
      .then(setSummary)
      .catch(() => show("Could not load payments.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    try {
      await purchasesApi.markPaid(id);
      show("Marked as paid.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not mark as paid.", "error");
    } finally {
      setMarkingId(null);
    }
  }

  if (loading || !summary) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Payments</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total pending" value={formatINR(summary.total_pending)} tone={summary.total_pending > 0 ? "warning" : "default"} />
        <StatCard label="Overdue" value={formatINR(summary.total_overdue)} tone={summary.total_overdue > 0 ? "critical" : "default"} />
      </div>

      {summary.groups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          No pending payments. Everything is settled.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {summary.groups.map((group) => (
            <div key={group.supplier_id ?? "none"} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="font-semibold text-gray-900">{group.supplier_name}</div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatINR(group.total)}</div>
                  {group.overdue_total > 0 && <div className="text-xs font-medium text-red-600">{formatINR(group.overdue_total)} overdue</div>}
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {group.purchases.map((p) => (
                  <div key={p.id} className={`flex items-center justify-between px-4 py-3 ${p.is_overdue ? "bg-red-50" : ""}`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.item_name}</div>
                      <div className="text-xs text-gray-500">
                        {formatDDMMYYYY(p.purchase_date)}
                        {p.payment_due_date && (
                          <span className={p.is_overdue ? "font-medium text-red-600" : ""}>
                            {" "}
                            · due {formatDDMMYYYY(p.payment_due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{formatINR(p.total_amount)}</span>
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={markingId === p.id}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
