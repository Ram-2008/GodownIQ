import { Alert, AlertType } from "../types/domain";
import { STATUS } from "./charts/theme";

const ALERT_LABELS: Record<AlertType, string> = {
  price_anomaly: "Price anomaly",
  low_stock: "Low stock",
  payment_overdue: "Payment overdue",
  reorder_reminder: "Reorder reminder",
};

const ALERT_COLORS: Record<AlertType, string> = {
  price_anomaly: STATUS.warning,
  low_stock: STATUS.serious,
  payment_overdue: STATUS.critical,
  reorder_reminder: STATUS.warning,
};

export function AlertsPanel({ alerts, onDismiss }: { alerts: Alert[]; onDismiss: (id: string) => void }) {
  if (alerts.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400">No active alerts.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <span
            className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: ALERT_COLORS[alert.type] }}
            aria-hidden
          />
          <div className="flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{ALERT_LABELS[alert.type]}</div>
            <div className="text-sm text-gray-800">{alert.message}</div>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            aria-label="Dismiss alert"
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
