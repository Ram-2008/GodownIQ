import { z } from "zod";

const positiveQty = z
  .number()
  .positive()
  .refine((v) => Number.isInteger(v * 100), "Up to 2 decimal places only");

export const stockOutSchema = z.object({
  item_id: z.string().uuid(),
  quantity: positiveQty,
  movement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "movement_date must be YYYY-MM-DD"),
  note: z.string().trim().max(500).optional(),
});
export type StockOutInput = z.infer<typeof stockOutSchema>;

export const stockAdjustmentSchema = z.object({
  item_id: z.string().uuid(),
  new_count: z.number().nonnegative(),
  movement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(500).optional(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
