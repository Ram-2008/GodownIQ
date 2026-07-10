import { api } from "./client";
import { Purchase, Unit } from "../types/domain";

export interface PhotoLineItem {
  item: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total: number;
}

export interface PhotoParseResult {
  supplier_name: string | null;
  invoice_number: string | null;
  date: string | null;
  gst_amount: number | null;
  line_items: PhotoLineItem[];
}

export interface ConfirmedLineItem {
  item_name: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  total_amount: number;
}

export interface SavePhotoEntryPayload {
  supplier_name?: string;
  invoice_number?: string;
  purchase_date: string;
  gst_amount?: number;
  line_items: ConfirmedLineItem[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:image/jpeg;base64," prefix — backend wants the raw base64 payload
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const photoEntryApi = {
  parse: async (file: File) => {
    const image_base64 = await fileToBase64(file);
    const media_type = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
    return api.post<{ result: PhotoParseResult }>("/photo-entry/parse", { image_base64, media_type }).then((r) => r.result);
  },
  save: (payload: SavePhotoEntryPayload) => api.post<{ purchases: Purchase[] }>("/photo-entry/save", payload).then((r) => r.purchases),
};
