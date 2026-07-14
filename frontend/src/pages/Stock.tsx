import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { TableSkeleton } from "../components/ui/Skeleton";
import { stockApi, StockOverviewRow } from "../api/stock";
import { itemsApi } from "../api/items";
import { Item } from "../types/domain";
import { formatIndianNumber } from "../utils/currency";
import { todayISO } from "../utils/date";

function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-400">—</span>;
  const tone = days < 3 ? "text-red-600" : days < 7 ? "text-amber-600" : "text-gray-700";
  return <span className={`font-medium ${tone}`}>{days.toFixed(1)}d</span>;
}

export function StockPage() {
  const { profile } = useAuth();
  const { show } = useToast();
  const isOwner = profile?.role === "owner";

  const [rows, setRows] = useState<StockOverviewRow[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [outItemId, setOutItemId] = useState("");
  const [outQuantity, setOutQuantity] = useState("");
  const [outDate, setOutDate] = useState(todayISO());
  const [outNote, setOutNote] = useState("");
  const [submittingOut, setSubmittingOut] = useState(false);

  const [thresholdEdits, setThresholdEdits] = useState<Record<string, string>>({});
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustCount, setAdjustCount] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([stockApi.list(), itemsApi.list()])
      .then(([stockRows, items]) => {
        setRows(stockRows);
        setAllItems(items);
      })
      .catch(() => show("Could not load stock data.", "error"))
      .finally(() => setLoading(false));
  }, [show]);

  useEffect(() => {
    load();
  }, [load]);

  const trackedItems = allItems.filter((i) => i.track_stock);
  const untrackedItems = allItems.filter((i) => !i.track_stock);
  const searchLower = search.trim().toLowerCase();
  const visibleRows = searchLower ? rows.filter((r) => r.name.toLowerCase().includes(searchLower)) : rows;
  const visibleUntracked = searchLower ? untrackedItems.filter((i) => i.name.toLowerCase().includes(searchLower)) : untrackedItems;

  async function handleStockOut(e: React.FormEvent) {
    e.preventDefault();
    if (!outItemId) return;
    setSubmittingOut(true);
    try {
      await stockApi.stockOut(outItemId, parseFloat(outQuantity), outDate, outNote.trim() || undefined);
      show("Stock out recorded.", "success");
      setOutQuantity("");
      setOutNote("");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not record stock out.", "error");
    } finally {
      setSubmittingOut(false);
    }
  }

  async function handleThresholdSave(itemId: string) {
    const raw = thresholdEdits[itemId];
    const value = raw === "" || raw === undefined ? null : parseFloat(raw);
    try {
      await itemsApi.update(itemId, { low_stock_threshold: value });
      show("Threshold updated.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not update threshold.", "error");
    }
  }

  async function handleEnableTracking(itemId: string) {
    try {
      await itemsApi.update(itemId, { track_stock: true });
      show("Stock tracking enabled.", "success");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not enable tracking.", "error");
    }
  }

  async function handleAdjustmentSave() {
    if (!adjustingItemId || adjustCount === "") return;
    try {
      await stockApi.adjustment(adjustingItemId, parseFloat(adjustCount), todayISO(), "Physical count correction");
      show("Stock count adjusted.", "success");
      setAdjustingItemId(null);
      setAdjustCount("");
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not adjust stock.", "error");
    }
  }

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">Stock</h1>

      <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <form onSubmit={handleStockOut} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Stock out</h2>
        <Select label="Item" value={outItemId} onChange={(e) => setOutItemId(e.target.value)} required>
          <option value="">Select item…</option>
          {trackedItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Quantity" type="number" step="0.01" min="0.01" required value={outQuantity} onChange={(e) => setOutQuantity(e.target.value)} />
          <Input label="Date" type="date" required max={todayISO()} value={outDate} onChange={(e) => setOutDate(e.target.value)} />
        </div>
        <Input label="Note (optional)" value={outNote} onChange={(e) => setOutNote(e.target.value)} />
        <Button type="submit" loading={submittingOut} disabled={trackedItems.length === 0}>
          Record stock out
        </Button>
        {trackedItems.length === 0 && <p className="text-xs text-gray-400">No items have stock tracking enabled yet.</p>}
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Tracked items</h2>
        {trackedItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">No tracked items yet.</div>
        ) : visibleRows.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">No items match "{search}".</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Current stock</th>
                  <th className="pb-2 text-right">Threshold</th>
                  <th className="pb-2 text-right">Days left</th>
                  {isOwner && <th className="pb-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRows.map((row) => (
                  <tr key={row.item_id} className={row.is_low_stock ? "bg-red-50" : ""}>
                    <td className="py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="py-2 text-right">
                      {formatIndianNumber(row.current_stock)} {row.unit}
                    </td>
                    <td className="py-2 text-right">
                      {isOwner ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm"
                            placeholder="—"
                            defaultValue={row.low_stock_threshold ?? ""}
                            onChange={(e) => setThresholdEdits((prev) => ({ ...prev, [row.item_id]: e.target.value }))}
                            onBlur={() => handleThresholdSave(row.item_id)}
                          />
                        </div>
                      ) : (
                        row.low_stock_threshold ?? "—"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <DaysLeftBadge days={row.days_of_stock_left} />
                    </td>
                    {isOwner && (
                      <td className="py-2 text-right">
                        <button
                          onClick={() => {
                            setAdjustingItemId(row.item_id);
                            setAdjustCount(String(row.current_stock));
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
                        >
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOwner && visibleUntracked.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Not tracked</h2>
          <div className="flex flex-wrap gap-2">
            {visibleUntracked.map((item) => (
              <button
                key={item.id}
                onClick={() => handleEnableTracking(item.id)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                + Track {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {adjustingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Adjust stock count</h2>
            <p className="mb-3 text-sm text-gray-500">Enter the actual counted quantity after a physical stock check.</p>
            <Input label="New count" type="number" step="0.01" min="0" value={adjustCount} onChange={(e) => setAdjustCount(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAdjustingItemId(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAdjustmentSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
