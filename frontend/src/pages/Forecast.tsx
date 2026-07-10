import { useEffect, useState } from "react";
import { forecastApi, ForecastResponse } from "../api/forecast";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { TableSkeleton } from "../components/ui/Skeleton";
import { formatINR, formatIndianNumber } from "../utils/currency";
import { formatDDMMYYYY } from "../utils/date";

const CONFIDENCE_COLORS: Record<string, string> = {
  low: "bg-amber-100 text-amber-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-green-100 text-green-700",
};

export function ForecastPage() {
  const { show } = useToast();
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    forecastApi
      .get()
      .then(setForecast)
      .catch(() => show("Could not load the forecast.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const updated = await forecastApi.regenerate();
      setForecast(updated);
      show("Forecast regenerated.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not regenerate the forecast.", "error");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading || !forecast) return <TableSkeleton rows={6} />;

  const hasLowConfidence = forecast.items.some((i) => i.confidence === "low");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Forecast &amp; Reorder</h1>
        <Button variant="secondary" loading={regenerating} disabled={!forecast.can_regenerate} onClick={handleRegenerate}>
          Regenerate
        </Button>
      </div>

      <div className="text-xs text-gray-400">
        Last generated {new Date(forecast.generated_at).toLocaleString("en-IN")}
        {!forecast.can_regenerate && forecast.next_regeneration_at && (
          <> · next regeneration available {new Date(forecast.next_regeneration_at).toLocaleString("en-IN")}</>
        )}
      </div>

      {forecast.generated_by === "fallback" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Basic forecast (AI unavailable) — using a simple moving average instead of AI predictions.
        </div>
      )}

      {hasLowConfidence && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          Items with under 21 days of purchase history are marked "low" confidence — accuracy improves as more data comes in.
        </div>
      )}

      {forecast.items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          Not enough purchase history yet to forecast anything.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Predicted qty (30d)</th>
                  <th className="pb-2 text-right">Predicted spend</th>
                  <th className="pb-2">Stockout</th>
                  <th className="pb-2">Confidence</th>
                  <th className="pb-2">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forecast.items.map((item) => (
                  <tr key={item.item_id}>
                    <td className="py-2 font-medium text-gray-900">{item.item_name}</td>
                    <td className="py-2 text-right">
                      {formatIndianNumber(item.predicted_quantity)} {item.unit}
                    </td>
                    <td className="py-2 text-right">{formatINR(item.predicted_spend)}</td>
                    <td className="py-2">
                      {item.predicted_stockout_date ? (
                        <span className="font-medium text-red-600">{formatDDMMYYYY(item.predicted_stockout_date)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[item.confidence]}`}>
                        {item.confidence}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-500">{item.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
