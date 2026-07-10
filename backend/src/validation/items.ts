import { z } from "zod";
import { unitEnum } from "./purchases";

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  default_unit: unitEnum,
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

// current_stock is never set directly — it's a maintained rollup from stock_movements
// (including 'adjustment' rows for physical-count corrections), so every change is audit-visible.
export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  default_unit: unitEnum.optional(),
  track_stock: z.boolean().optional(),
  low_stock_threshold: z.number().nonnegative().nullable().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
