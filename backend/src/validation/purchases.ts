import { z } from "zod";

const money = z
  .number()
  .nonnegative()
  .refine((v) => Number.isInteger(v * 100), "Up to 2 decimal places only");

const positiveQty = z
  .number()
  .positive()
  .refine((v) => Number.isInteger(v * 100), "Up to 2 decimal places only");

export const unitEnum = z.enum(["kg", "litre", "pieces", "bags", "quintal"]);
export const entrySourceEnum = z.enum(["form", "quick_chip", "nl_text", "whatsapp", "photo"]);

export const createPurchaseSchema = z
  .object({
    item_name: z.string().trim().min(1).max(120).optional(),
    item_id: z.string().uuid().optional(),
    default_unit_for_new_item: unitEnum.optional(),
    quantity: positiveQty,
    unit: unitEnum,
    unit_price: money,
    total_amount: money,
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "purchase_date must be YYYY-MM-DD"),
    supplier_name: z.string().trim().min(1).max(120).optional(),
    supplier_id: z.string().uuid().optional(),
    invoice_number: z.string().trim().max(60).optional(),
    gst_amount: money.optional(),
    payment_status: z.enum(["paid", "pending"]).default("paid"),
    payment_due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    note: z.string().trim().max(500).optional(),
    entry_source: entrySourceEnum.default("form"),
  })
  .refine((v) => v.item_id || v.item_name, { message: "item_id or item_name is required", path: ["item_name"] })
  .refine((v) => !v.supplier_name || v.supplier_name.length > 0, { message: "supplier_name cannot be blank" });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const updatePurchaseSchema = z.object({
  quantity: positiveQty.optional(),
  unit: unitEnum.optional(),
  unit_price: money.optional(),
  total_amount: money.optional(),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  invoice_number: z.string().trim().max(60).nullable().optional(),
  gst_amount: money.nullable().optional(),
  payment_status: z.enum(["paid", "pending"]).optional(),
  payment_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

export const listPurchasesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  item_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(200).default(50),
});
