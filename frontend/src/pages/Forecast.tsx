import { useEffect, useState } from "react";
import { forecastApi, ForecastResponse } from "../api/forecast";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
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
  const totalPredictedSpend = forecast.items.reduce((sum, i) => sum + i.predicted_spend, 0);
  const upcomingStockouts = forecast.items.filter((i) => i.predicted_stockout_date).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Forecast &amp; Reorder</h1>
          <div className="mt-1 text-xs text-gray-400">
            Last generated {new Date(forecast.generated_at).toLocaleString("en-IN")}
            {!forecast.can_regenerate && forecast.next_regeneration_at && (
              <> · next regeneration available {new Date(forecast.next_regeneration_at).toLocaleString("en-IN")}</>
            )}
          </div>
        </div>
        <Button variant="secondary" loading={regenerating} disabled={!forecast.can_regenerate} onClick={handleRegenerate}>
          Regenerate
        </Button>
      </div>

      {forecast.items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Items tracked" value={String(forecast.items.length)} />
          <StatCard label="Predicted spend (30d)" value={formatINR(totalPredictedSpend)} />
          <StatCard label="Upcoming stockouts" value={String(upcomingStockouts)} tone={upcomingStockouts > 0 ? "critical" : "default"} />
        </div>
      )}

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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {forecast.items.map((item) => (
              <div key={item.item_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{item.item_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[item.confidence]}`}>
                      {item.confidence} confidence
                    </span>
                    {item.predicted_stockout_date && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Stockout ~{formatDDMMYYYY(item.predicted_stockout_date)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-gray-500">{item.reasoning}</p>
                </div>

                <div className="flex flex-shrink-0 gap-6 sm:text-right">
                  <div>
                    <div className="text-xs text-gray-400">Predicted qty (30d)</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatIndianNumber(item.predicted_quantity)} {item.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Predicted spend</div>
                    <div className="text-sm font-semibold text-gray-900">{formatINR(item.predicted_spend)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
