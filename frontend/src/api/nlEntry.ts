import { api } from "./client";
import { PaymentStatus, Unit } from "../types/domain";

export interface NlParseResult {
  item: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total_amount: number;
  supplier_name?: string | null;
  payment_status: PaymentStatus;
}

export const nlEntryApi = {
  parse: (text: string) => api.post<{ result: NlParseResult }>("/nl-entry/parse", { text }).then((r) => r.result),
};
