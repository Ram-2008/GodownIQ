import { api } from "./client";

export type IncidentType = "late_delivery" | "shortage" | "damage" | "other";
export interface IncidentInput {
  id: string;
  supplier_id: string;
  incident_date: string;
  incident_type: IncidentType;
  description: string;
  resolution: string | null;
  resolved_date: string | null;
  is_demo: boolean;
}
export interface SupplierIncident extends IncidentInput {
  supplier_name: string;
  created_at: string;
  created_by: string;
  memory_status: "pending" | "synced";
  memory_synced_at: string | null;
  memory_bank_id: string | null;
}
export const supplierIncidentsApi = {
  list: (page: number) => api.get<{ incidents: SupplierIncident[]; total: number; page_size: number }>(`/supplier-incidents?page=${page}`),
  create: (input: IncidentInput) => api.post<{ incident: SupplierIncident }>("/supplier-incidents", input).then((r) => r.incident),
  sync: (id: string) => api.post<{ incident: SupplierIncident; warning: string | null }>(`/supplier-incidents/${id}/sync`),
};
