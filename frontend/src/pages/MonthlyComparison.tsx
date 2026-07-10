import { useEffect, useState } from "react";
import { subMonths } from "date-fns";
import { comparisonApi, ComparisonResult, ComparisonRow } from "../api/comparison";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatINR, formatIndianNumber } from "../utils/currency";

function monthValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function pctLabel(pct: number | null): string {
  if (pct === null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function attributionText(row: ComparisonRow): string {
  if (row.status === "new") return "New this period";
  if (row.status === "stopped") return "Not bought this period";
  if (row.spend_change_pct === null) return "—";
  const parts: string[] = [];
  if (row.quantity_effect_pct !== null && Math.abs(row.quantity_effect_pct) >= 0.5) {
    parts.push(`quantity ${row.quantity_effect_pct >= 0 ? "+" : ""}${row.quantity_effect_pct.toFixed(0)}%`);
  }
  if (row.price_effect_pct !== null && Math.abs(row.price_effect_pct) >= 0.5) {
    parts.push(`price ${row.price_effect_pct >= 0 ? "+" : ""}${row.price_effect_pct.toFixed(0)}%`);
  }
  return parts.length > 0 ? parts.join(", ") : "no significant change";
}

export function MonthlyComparisonPage() {
  const { show } = useToast();
  const now = new Date();
  const [period1Value, setPeriod1Value] = useState(monthValue(subMonths(now, 1)));
  const [period2Value, setPeriod2Value] = useState(monthValue(now));
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [y1, m1] = period1Value.split("-").map(Number);
    const [y2, m2] = period2Value.split("-").map(Number);
    setLoading(true);
    comparisonApi
      .get(y1, m1, y2, m2)
      .then(setResult)
      .catch(() => show("Could not load the comparison.", "error"))
      .finally(() => setLoading(false));
  }, [period1Value, period2Value, show]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Monthly Comparison</h1>

      <div className="flex items-center gap-3">
        <input type="month" value={period1Value} onChange={(e) => setPeriod1Value(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm" />
        <span className="text-gray-400">vs</span>
        <input type="month" value={period2Value} onChange={(e) => setPeriod2Value(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm" />
      </div>

      {loading || !result ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Qty change</th>
                  <th className="pb-2 text-right">Spend change</th>
                  <th className="pb-2">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((row) => (
                  <tr key={row.item_id}>
                    <td className="py-2 font-medium text-gray-900">{row.item_name}</td>
                    <td className="py-2 text-right">{pctLabel(row.quantity_change_pct)}</td>
                    <td className={`py-2 text-right font-medium ${row.spend_change_pct !== null && row.spend_change_pct > 0 ? "text-red-600" : "text-gray-900"}`}>
                      {pctLabel(row.spend_change_pct)}
                    </td>
                    <td className="py-2 text-gray-500">{attributionText(row)}</td>
                  </tr>
                ))}
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      No purchases in either period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right">{formatIndianNumber(result.totals.period2.quantity)}</td>
                  <td className="pt-2 text-right">
                    {formatINR(result.totals.period2.spend)} ({pctLabel(result.totals.spend_change_pct)})
                  </td>
                  <td className="pt-2 text-xs font-normal text-gray-400">was {formatINR(result.totals.period1.spend)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
