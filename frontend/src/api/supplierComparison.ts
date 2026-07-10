import { api } from "./client";

export interface SupplierBreakdownEntry {
  supplier_id: string;
  supplier_name: string;
  avg_unit_price: number;
  last_unit_price: number;
  last_purchase_date: string;
  total_quantity: number;
  is_cheapest: boolean;
}

export interface ItemSupplierBreakdown {
  item_id: string;
  item_name: string;
  suppliers: SupplierBreakdownEntry[];
}

export interface SupplierComparisonResult {
  by_item: ItemSupplierBreakdown[];
  overall_this_month: { supplier_id: string; supplier_name: string; total: number }[];
}

export const supplierComparisonApi = {
  get: () => api.get<SupplierComparisonResult>("/supplier-comparison"),
};
