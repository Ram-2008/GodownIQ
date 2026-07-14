import { api, apiDownload } from "./client";

export interface MonthlyReport {
  total_spend: number;
  gst_total: number;
  pending_amount: number;
  per_item: { item_id: string; item_name: string; quantity: number; avg_price: number; total: number }[];
  per_supplier: { supplier_id: string | null; supplier_name: string; total: number }[];
  expenses_total: number;
  per_category: { category: string; total: number }[];
}

export const reportsApi = {
  monthly: (year: number, month: number) => api.get<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`),
  purchasesCsv: (year: number, month: number) => apiDownload(`/reports/purchases.csv?year=${year}&month=${month}`),
  fullBackupCsv: () => apiDownload("/reports/purchases/backup.csv"),
  stockMovementsCsv: () => apiDownload("/reports/stock-movements.csv"),
  expensesCsv: (year: number, month: number) => apiDownload(`/reports/expenses.csv?year=${year}&month=${month}`),
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
