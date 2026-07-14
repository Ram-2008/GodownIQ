import { useEffect, useState } from "react";
import { downloadBlob, MonthlyReport, reportsApi } from "../api/reports";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatINR, formatIndianNumber } from "../utils/currency";
import { formatMonthLabel } from "../utils/date";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportsPage() {
  const { show } = useToast();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [year, month] = monthValue.split("-").map(Number);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .monthly(year, month)
      .then(setReport)
      .catch(() => show("Could not load the report.", "error"))
      .finally(() => setLoading(false));
  }, [year, month, show]);

  async function handleDownload(kind: "month" | "backup" | "stock" | "expenses") {
    setDownloading(kind);
    try {
      if (kind === "month") {
        const blob = await reportsApi.purchasesCsv(year, month);
        downloadBlob(blob, `purchases-${monthValue}.csv`);
      } else if (kind === "backup") {
        const blob = await reportsApi.fullBackupCsv();
        downloadBlob(blob, "godowniq-full-backup.csv");
      } else if (kind === "expenses") {
        const blob = await reportsApi.expensesCsv(year, month);
        downloadBlob(blob, `expenses-${monthValue}.csv`);
      } else {
        const blob = await reportsApi.stockMovementsCsv();
        downloadBlob(blob, "stock-movements.csv");
      }
    } catch {
      show("Could not download the file.", "error");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>

      {loading || !report ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          <div className="text-sm text-gray-500">{formatMonthLabel(year, month)}</div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total spend" value={formatINR(report.total_spend)} />
            <StatCard label="GST total" value={formatINR(report.gst_total)} />
            <StatCard label="Pending" value={formatINR(report.pending_amount)} tone={report.pending_amount > 0 ? "warning" : "default"} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Per item</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Avg price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.per_item.map((row) => (
                    <tr key={row.item_id}>
                      <td className="py-2">{row.item_name}</td>
                      <td className="py-2 text-right">{formatIndianNumber(row.quantity)}</td>
                      <td className="py-2 text-right">{formatINR(row.avg_price)}</td>
                      <td className="py-2 text-right font-medium">{formatINR(row.total)}</td>
                    </tr>
                  ))}
                  {report.per_item.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">
                        No purchases this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Per supplier</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Supplier</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.per_supplier.map((row) => (
                    <tr key={row.supplier_id ?? "none"}>
                      <td className="py-2">{row.supplier_name}</td>
                      <td className="py-2 text-right font-medium">{formatINR(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Other expenses by category</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.per_category.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2 capitalize">{row.category}</td>
                      <td className="py-2 text-right font-medium">{formatINR(row.total)}</td>
                    </tr>
                  ))}
                  {report.per_category.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-gray-400">
                        No expenses this month.
                      </td>
                    </tr>
                  )}
                </tbody>
                {report.per_category.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 text-sm font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">{formatINR(report.expenses_total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={downloading === "month"} onClick={() => handleDownload("month")}>
              Download month CSV
            </Button>
            <Button variant="secondary" loading={downloading === "expenses"} onClick={() => handleDownload("expenses")}>
              Expenses CSV
            </Button>
            <Button variant="secondary" loading={downloading === "stock"} onClick={() => handleDownload("stock")}>
              Stock movements CSV
            </Button>
            <Button variant="secondary" loading={downloading === "backup"} onClick={() => handleDownload("backup")}>
              Full backup CSV
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
