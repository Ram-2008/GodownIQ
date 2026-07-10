import { z } from "zod";
import { unitEnum } from "./purchases";

export const nlParseRequestSchema = z.object({
  text: z.string().trim().min(3).max(500),
});

export const nlParseResultSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().positive(),
  unit: unitEnum,
  unit_price: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  supplier_name: z.string().min(1).nullable().optional(),
  payment_status: z.enum(["paid", "pending"]).default("paid"),
});
export type NlParseResult = z.infer<typeof nlParseResultSchema>;
