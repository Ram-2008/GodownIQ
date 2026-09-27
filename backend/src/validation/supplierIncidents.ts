import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");

export const createSupplierIncidentSchema = z.object({
  id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  incident_date: dateOnly,
  incident_type: z.enum(["late_delivery", "shortage", "damage", "other"]),
  description: z.string().trim().min(10).max(3000),
  resolution: z.string().trim().min(3).max(2000).nullable().default(null),
  resolved_date: dateOnly.nullable().default(null),
  is_demo: z.boolean().default(false),
}).strict().superRefine((input, ctx) => {
  if ((input.resolution === null) !== (input.resolved_date === null)) {
    ctx.addIssue({ code: "custom", path: ["resolved_date"], message: "Provide both the resolution and its date, or leave both empty." });
  }
  if (input.resolved_date && input.resolved_date < input.incident_date) {
    ctx.addIssue({ code: "custom", path: ["resolved_date"], message: "Resolution cannot be before the incident." });
  }
});
export type CreateSupplierIncidentInput = z.infer<typeof createSupplierIncidentSchema>;
export const incidentIdSchema = z.string().uuid();
export const incidentListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
