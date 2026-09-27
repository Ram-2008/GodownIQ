import { api } from "./client";
export type OutcomeStatus = "worked" | "partly_worked" | "did_not_work";
export interface OutcomeInput {
  id: string; supplier_id: string; related_incident_id: string;
  action_taken: string; outcome_status: OutcomeStatus; result_details: string;
  outcome_date: string; is_demo: boolean;
}
export interface SupplierOutcome extends OutcomeInput {
  supplier_name: string; created_by: string; created_at: string;
  memory_status: "pending" | "synced"; memory_synced_at: string | null; memory_bank_id: string | null;
}
export const supplierOutcomesApi = {
  list: (supplierId: string, demoMode: boolean, page: number) =>
    api.get<{ outcomes: SupplierOutcome[]; total: number }>(`/supplier-outcomes?supplier_id=${supplierId}&demo_mode=${demoMode}&page=${page}`),
  create: (input: OutcomeInput) => api.post<{ outcome: SupplierOutcome }>("/supplier-outcomes", input).then((r) => r.outcome),
  sync: (id: string) => api.post<{ outcome: SupplierOutcome; warning: string | null }>(`/supplier-outcomes/${id}/sync`),
};
