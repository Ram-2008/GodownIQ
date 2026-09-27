import { z } from "zod";
import { indiaToday } from "../utils/indiaDate";

export const createSupplierOutcomeSchema = z.object({
  id: z.string().uuid(), supplier_id: z.string().uuid(), related_incident_id: z.string().uuid(),
  action_taken: z.string().trim().min(10).max(2000),
  outcome_status: z.enum(["worked", "partly_worked", "did_not_work"]),
  result_details: z.string().trim().min(10).max(3000),
  outcome_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= indiaToday();
  }, "Use a valid date on or before today; record completed outcomes only."),
  is_demo: z.boolean(),
}).strict();
export type CreateSupplierOutcomeInput = z.infer<typeof createSupplierOutcomeSchema>;
export const listSupplierOutcomesSchema = z.object({
  supplier_id: z.string().uuid(),
  demo_mode: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
