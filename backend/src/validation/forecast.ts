import { z } from "zod";

export const forecastItemAiSchema = z.object({
  item_id: z.string(),
  predicted_quantity: z.number().nonnegative(),
  predicted_spend: z.number().nonnegative(),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string().min(1).max(500),
});

export const forecastAiResponseSchema = z.array(forecastItemAiSchema);
