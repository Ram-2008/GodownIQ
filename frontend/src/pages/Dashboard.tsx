import { useCallback, useEffect, useState } from "react";
import { StatCard } from "../components/ui/StatCard";
import { CardSkeleton } from "../components/ui/Skeleton";
import { DailySpendChart } from "../components/charts/DailySpendChart";
import { TopItemsBarChart } from "../components/charts/TopItemsBarChart";
import { AlertsPanel } from "../components/AlertsPanel";
import { ItemDetailModal } from "../components/ItemDetailModal";
import { useToast } from "../components/Toast";
import { dashboardApi, DashboardSummary } from "../api/dashboard";
import { alertsApi } from "../api/alerts";
import { formatINR } from "../utils/currency";

export function DashboardPage() {
  const { show } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    dashboardApi
      .summary()
      .then(setSummary)
      .catch(() => show("Could not load the dashboard.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDismiss(id: string) {
    setSummary((prev) => (prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== id), active_alerts_count: prev.active_alerts_count - 1 } : prev));
    try {
      await alertsApi.dismiss(id);
    } catch {
      show("Could not dismiss the alert.", "error");
      load();
    }
  }

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's spend" value={formatINR(summary.today_spend)} />
        <StatCard label="This month" value={formatINR(summary.month_spend)} />
        <StatCard label="Pending payments" value={formatINR(summary.pending_total)} tone={summary.pending_total > 0 ? "warning" : "default"} />
        <StatCard label="Active alerts" value={String(summary.active_alerts_count)} tone={summary.active_alerts_count > 0 ? "critical" : "default"} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Daily spend this month</h2>
        <DailySpendChart data={summary.daily_spend} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Top 5 items this month</h2>
        {summary.top_items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No purchases yet this month.</div>
        ) : (
          <TopItemsBarChart data={summary.top_items} onSelect={setSelectedItemId} />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Alerts</h2>
        <AlertsPanel alerts={summary.alerts} onDismiss={handleDismiss} />
      </div>

      {selectedItemId && <ItemDetailModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />}
    </div>
  );
}
