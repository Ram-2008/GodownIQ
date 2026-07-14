import { api } from "./client";
import { EntrySource, PaymentStatus, Purchase, QuickChip, Unit } from "../types/domain";

export interface CreatePurchasePayload {
  item_id?: string;
  item_name?: string;
  default_unit_for_new_item?: Unit;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  supplier_id?: string;
  supplier_name?: string;
  invoice_number?: string;
  gst_amount?: number;
  payment_status: PaymentStatus;
  payment_due_date?: string;
  note?: string;
  entry_source?: EntrySource;
}

export interface UpdatePurchasePayload {
  quantity?: number;
  unit?: Unit;
  unit_price?: number;
  total_amount?: number;
  purchase_date?: string;
  supplier_id?: string | null;
  invoice_number?: string | null;
  gst_amount?: number | null;
  payment_status?: PaymentStatus;
  payment_due_date?: string | null;
  note?: string | null;
}

export interface ListPurchasesParams {
  from?: string;
  to?: string;
  item_id?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

function toQueryString(params: ListPurchasesParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const purchasesApi = {
  quickChips: () => api.get<{ chips: QuickChip[] }>("/purchases/quick-chips").then((r) => r.chips),
  list: (params: ListPurchasesParams = {}) =>
    api.get<{ purchases: Purchase[]; total: number }>(`/purchases${toQueryString(params)}`),
  get: (id: string) => api.get<{ purchase: Purchase }>(`/purchases/${id}`).then((r) => r.purchase),
  create: (payload: CreatePurchasePayload) => api.post<{ purchase: Purchase }>("/purchases", payload).then((r) => r.purchase),
  update: (id: string, payload: UpdatePurchasePayload) =>
    api.patch<{ purchase: Purchase }>(`/purchases/${id}`, payload).then((r) => r.purchase),
  remove: (id: string) => api.delete<void>(`/purchases/${id}`),
  billImageUrl: (id: string) => api.get<{ url: string }>(`/purchases/${id}/bill-image`).then((r) => r.url),
  markPaid: (id: string) => api.post<{ purchase: Purchase }>(`/purchases/${id}/mark-paid`).then((r) => r.purchase),
};
