import { api } from "./client";
import { Purchase } from "../types/domain";

export interface PendingPaymentGroup {
  supplier_id: string | null;
  supplier_name: string;
  total: number;
  overdue_total: number;
  purchases: (Purchase & { is_overdue: boolean })[];
}

export interface PendingPaymentsSummary {
  total_pending: number;
  total_overdue: number;
  groups: PendingPaymentGroup[];
}

export const paymentsApi = {
  summary: () => api.get<PendingPaymentsSummary>("/payments"),
};
