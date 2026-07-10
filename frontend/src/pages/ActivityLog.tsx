import { useEffect, useState } from "react";
import { auditLogApi, AuditLogEntry } from "../api/auditLog";
import { useToast } from "../components/Toast";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { formatINR } from "../utils/currency";

const ACTION_LABELS: Record<AuditLogEntry["action"], string> = {
  create: "created",
  update: "edited",
  delete: "deleted",
  payment_marked_paid: "marked paid",
};

const DIFF_IGNORE_KEYS = new Set(["updated_at", "created_at", "item_name", "supplier_name"]);

function itemNameOf(entry: AuditLogEntry): string {
  return (entry.new_values?.item_name as string) ?? (entry.old_values?.item_name as string) ?? "an item";
}

function describeChanges(entry: AuditLogEntry): string | null {
  if (entry.action !== "update" || !entry.old_values || !entry.new_values) return null;
  const parts: string[] = [];
  for (const key of Object.keys(entry.new_values)) {
    if (DIFF_IGNORE_KEYS.has(key)) continue;
    const oldVal = entry.old_values[key];
    const newVal = entry.new_values[key];
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;
    parts.push(`${key}: ${oldVal ?? "—"} → ${newVal ?? "—"}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

export function ActivityLogPage() {
  const { show } = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  useEffect(() => {
    setLoading(true);
    auditLogApi
      .list(page, pageSize)
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch(() => show("Could not load the activity log.", "error"))
      .finally(() => setLoading(false));
  }, [page, show]);

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">No activity yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const changes = describeChanges(entry);
            const newVals = entry.new_values ?? {};
            return (
              <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(entry.changed_at).toLocaleString("en-IN")}</span>
                  <span>{entry.changed_by_name}</span>
                </div>
                <div className="mt-1 text-sm text-gray-800">
                  {entry.changed_by_name} {ACTION_LABELS[entry.action]} <span className="font-medium">{itemNameOf(entry)}</span>
                  {entry.action === "create" && newVals.total_amount != null && (
                    <span className="text-gray-500"> — {formatINR(Number(newVals.total_amount))}</span>
                  )}
                </div>
                {changes && <div className="mt-1 text-xs text-gray-500">{changes}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-xs text-gray-400">
          Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <Button variant="secondary" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
