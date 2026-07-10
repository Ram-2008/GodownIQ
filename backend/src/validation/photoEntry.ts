import { z } from "zod";
import { unitEnum } from "./purchases";

export const photoParseRequestSchema = z.object({
  image_base64: z.string().min(100, "Image data looks too small to be a real photo"),
  media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type PhotoParseRequest = z.infer<typeof photoParseRequestSchema>;

const rawLineItemSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional().nullable(),
  unit_price: z.number().nonnegative().optional().nullable(),
  total: z.number().nonnegative().optional().nullable(),
});

export const photoParseResultSchema = z.object({
  supplier_name: z.string().min(1).nullable().optional(),
  invoice_number: z.string().min(1).nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  line_items: z.array(rawLineItemSchema).min(1),
  gst_amount: z.number().nonnegative().nullable().optional(),
});
export type RawPhotoParseResult = z.infer<typeof photoParseResultSchema>;

const UNIT_SYNONYMS: Record<string, string> = {
  pcs: "pieces",
  pc: "pieces",
  piece: "pieces",
  nos: "pieces",
  no: "pieces",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ltr: "litre",
  ltrs: "litre",
  liter: "litre",
  liters: "litre",
  litres: "litre",
  l: "litre",
  bag: "bags",
  qtl: "quintal",
  quintals: "quintal",
};

export function normalizeUnit(raw: string | null | undefined): z.infer<typeof unitEnum> {
  if (!raw) return "kg";
  const lower = raw.trim().toLowerCase();
  if (unitEnum.safeParse(lower).success) return lower as z.infer<typeof unitEnum>;
  return (UNIT_SYNONYMS[lower] as z.infer<typeof unitEnum>) ?? "kg";
}

export interface PhotoLineItem {
  item: string;
  quantity: number;
  unit: z.infer<typeof unitEnum>;
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

export function normalizePhotoParseResult(raw: RawPhotoParseResult): PhotoParseResult {
  return {
    supplier_name: raw.supplier_name ?? null,
    invoice_number: raw.invoice_number ?? null,
    date: raw.date ?? null,
    gst_amount: raw.gst_amount ?? null,
    line_items: raw.line_items.map((li) => {
      const unit = normalizeUnit(li.unit);
      const unitPrice = li.unit_price ?? (li.total ? li.total / li.quantity : 0);
      const total = li.total ?? unitPrice * li.quantity;
      return { item: li.item, quantity: li.quantity, unit, unit_price: unitPrice, total };
    }),
  };
}

export const confirmedLineItemSchema = z.object({
  item_name: z.string().trim().min(1).max(120),
  quantity: z.number().positive(),
  unit: unitEnum,
  unit_price: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
});

export const savePhotoEntrySchema = z.object({
  supplier_name: z.string().trim().min(1).max(120).optional(),
  invoice_number: z.string().trim().max(60).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gst_amount: z.number().nonnegative().optional(),
  line_items: z.array(confirmedLineItemSchema).min(1),
});
export type SavePhotoEntryInput = z.infer<typeof savePhotoEntrySchema>;
