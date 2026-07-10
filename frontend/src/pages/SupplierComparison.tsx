import { useEffect, useState } from "react";
import { supplierComparisonApi, SupplierComparisonResult } from "../api/supplierComparison";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatINR, formatIndianNumber } from "../utils/currency";
import { formatDDMMYYYY } from "../utils/date";

export function SupplierComparisonPage() {
  const { show } = useToast();
  const [result, setResult] = useState<SupplierComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierComparisonApi
      .get()
      .then(setResult)
      .catch(() => show("Could not load supplier comparison.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  if (loading || !result) return <TableSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Supplier Comparison</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Total spend per supplier this month</h2>
        {result.overall_this_month.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-400">No purchases this month.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {result.overall_this_month.map((s) => (
              <div key={s.supplier_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{s.supplier_name}</span>
                <span className="font-medium text-gray-900">{formatINR(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {result.by_item.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            No purchases with a supplier recorded yet.
          </div>
        )}
        {result.by_item.map((item) => (
          <div key={item.item_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">{item.item_name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Supplier</th>
                    <th className="pb-2 text-right">Avg price</th>
                    <th className="pb-2 text-right">Last price</th>
                    <th className="pb-2 text-right">Total qty</th>
                    <th className="pb-2 text-right">Last purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.suppliers.map((s) => (
                    <tr key={s.supplier_id} className={s.is_cheapest ? "bg-green-50" : ""}>
                      <td className="py-2">
                        {s.supplier_name}
                        {s.is_cheapest && (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Cheapest</span>
                        )}
                      </td>
                      <td className="py-2 text-right">{formatINR(s.avg_unit_price)}</td>
                      <td className="py-2 text-right">{formatINR(s.last_unit_price)}</td>
                      <td className="py-2 text-right">{formatIndianNumber(s.total_quantity)}</td>
                      <td className="py-2 text-right text-gray-500">{formatDDMMYYYY(s.last_purchase_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
