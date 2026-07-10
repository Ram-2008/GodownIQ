import { useEffect, useMemo, useState } from "react";
import { addMonths, getDay, subMonths } from "date-fns";
import clsx from "clsx";
import { calendarApi, CalendarDayTotal } from "../api/calendar";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Modal } from "../components/ui/Modal";
import { PurchaseEditModal } from "../components/PurchaseEditModal";
import { contrastTextColor, sequentialStep } from "../components/charts/theme";
import { formatINR } from "../utils/currency";
import { formatDDMMYYYY, formatMonthLabel } from "../utils/date";
import { Purchase } from "../types/domain";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPage() {
  const { show } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDayTotal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayPurchases, setDayPurchases] = useState<(Purchase & { can_edit: boolean })[]>([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<(Purchase & { can_edit: boolean }) | null>(null);

  useEffect(() => {
    setLoading(true);
    calendarApi
      .month(year, month)
      .then(setDays)
      .catch(() => show("Could not load the calendar.", "error"))
      .finally(() => setLoading(false));
  }, [year, month, show]);

  const maxTotal = useMemo(() => Math.max(0, ...days.map((d) => d.total)), [days]);

  const leadingBlanks = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    return getDay(first);
  }, [year, month]);

  function goToMonth(delta: number) {
    const base = new Date(year, month - 1, 1);
    const next = delta > 0 ? addMonths(base, 1) : subMonths(base, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  function openDay(date: string, hasData: boolean) {
    if (!hasData) return;
    setSelectedDate(date);
    setDayLoading(true);
    calendarApi
      .day(date)
      .then(setDayPurchases)
      .catch(() => show("Could not load purchases for this day.", "error"))
      .finally(() => setDayLoading(false));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => goToMonth(-1)} className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100">
          ← Prev
        </button>
        <h1 className="text-lg font-bold text-gray-900">{formatMonthLabel(year, month)}</h1>
        <button onClick={() => goToMonth(1)} className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100">
          Next →
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {days.map((day) => {
              const dayNum = Number(day.date.slice(8, 10));
              const hasData = day.total > 0;
              const bgColor = hasData ? sequentialStep(day.total, maxTotal) : undefined;
              return (
                <button
                  key={day.date}
                  onClick={() => openDay(day.date, hasData)}
                  className={clsx(
                    "flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold transition-transform",
                    hasData ? "hover:scale-105" : "text-gray-500"
                  )}
                  style={bgColor ? { backgroundColor: bgColor, color: contrastTextColor(bgColor) } : undefined}
                  disabled={!hasData}
                >
                  <span>{dayNum}</span>
                  {hasData && <span className="text-[10px]">{formatINR(day.total, { decimals: false })}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-gray-400">Darker = higher spend that day. Tap a day to see entries.</div>
        </div>
      )}

      {selectedDate && (
        <Modal title={formatDDMMYYYY(selectedDate)} onClose={() => setSelectedDate(null)}>
          {dayLoading ? (
            <TableSkeleton rows={3} />
          ) : dayPurchases.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No purchases that day.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dayPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <div className="font-medium text-gray-900">{p.item_name}</div>
                    <div className="text-xs text-gray-500">
                      {p.quantity} {p.unit} · {formatINR(p.unit_price)}/{p.unit}
                      {p.supplier_name ? ` · ${p.supplier_name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{formatINR(p.total_amount)}</span>
                    {p.can_edit && (
                      <button
                        onClick={() => setEditingPurchase(p)}
                        className="rounded-lg px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {editingPurchase && (
        <PurchaseEditModal
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSaved={(updated) => {
            setDayPurchases((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, can_edit: p.can_edit } : p)));
            setEditingPurchase(null);
            calendarApi.month(year, month).then(setDays).catch(() => undefined);
          }}
          onDeleted={(id) => {
            setDayPurchases((prev) => prev.filter((p) => p.id !== id));
            setEditingPurchase(null);
            calendarApi.month(year, month).then(setDays).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
