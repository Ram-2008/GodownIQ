import { api } from "./client";

export interface AuditLogEntry {
  id: string;
  purchase_id: string;
  action: "create" | "update" | "delete" | "payment_marked_paid";
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export const auditLogApi = {
  list: (page = 1, pageSize = 50) =>
    api.get<{ entries: AuditLogEntry[]; total: number }>(`/audit-log?page=${page}&page_size=${pageSize}`),
};
