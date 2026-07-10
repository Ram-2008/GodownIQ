export type Unit = "kg" | "litre" | "pieces" | "bags" | "quintal";
export type PaymentStatus = "paid" | "pending";
export type EntrySource = "form" | "quick_chip" | "nl_text" | "whatsapp" | "photo";
export type MovementType = "in" | "out" | "adjustment";
export type AlertType = "price_anomaly" | "low_stock" | "payment_overdue" | "reorder_reminder";

export const UNITS: Unit[] = ["kg", "litre", "pieces", "bags", "quintal"];

export interface Item {
  id: string;
  name: string;
  default_unit: Unit;
  track_stock: boolean;
  current_stock: number | null;
  low_stock_threshold: number | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  gst_amount: number | null;
  payment_status: PaymentStatus;
  payment_due_date: string | null;
  note: string | null;
  entry_source: EntrySource;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuickChip {
  item_id: string;
  item_name: string;
  unit: Unit;
  last_unit_price: number;
  median_quantity: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  related_id: string | null;
  created_at: string;
  dismissed_at: string | null;
}
