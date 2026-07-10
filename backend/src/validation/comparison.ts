import { z } from "zod";

export const comparisonQuerySchema = z.object({
  year1: z.coerce.number().int().min(2000).max(2100).optional(),
  month1: z.coerce.number().int().min(1).max(12).optional(),
  year2: z.coerce.number().int().min(2000).max(2100).optional(),
  month2: z.coerce.number().int().min(1).max(12).optional(),
});
