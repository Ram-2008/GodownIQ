import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { TableSkeleton } from "./ui/Skeleton";
import { PriceTrendChart } from "./charts/PriceTrendChart";
import { dashboardApi, ItemDetail } from "../api/dashboard";
import { formatINR, formatIndianNumber } from "../utils/currency";
import { useToast } from "./Toast";

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "0%" : "new";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export function ItemDetailModal({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { show } = useToast();
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .itemDetail(itemId)
      .then(setDetail)
      .catch(() => show("Could not load item details.", "error"))
      .finally(() => setLoading(false));
  }, [itemId, show]);

  return (
    <Modal title={detail?.item.name ?? "Item detail"} onClose={onClose}>
      {loading || !detail ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">90-day unit price trend</div>
            <PriceTrendChart data={detail.price_trend} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-400">This month</div>
              <div className="font-semibold text-gray-900">{formatINR(detail.this_month.spend)}</div>
              <div className="text-xs text-gray-500">
                {formatIndianNumber(detail.this_month.quantity)} {detail.item.default_unit} ·{" "}
                {pctChange(detail.this_month.spend, detail.last_month.spend)} vs last month
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-400">Last month</div>
              <div className="font-semibold text-gray-900">{formatINR(detail.last_month.spend)}</div>
              <div className="text-xs text-gray-500">
                {formatIndianNumber(detail.last_month.quantity)} {detail.item.default_unit}
              </div>
            </div>
          </div>

          {detail.item.track_stock && (
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-400">Stock</div>
              <div className="font-semibold text-gray-900">
                {formatIndianNumber(detail.item.current_stock ?? 0)} {detail.item.default_unit}
              </div>
              {detail.item.low_stock_threshold != null && (
                <div className="text-xs text-gray-500">Low-stock threshold: {formatIndianNumber(detail.item.low_stock_threshold)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
