import { z } from "zod";

export const supplierAdvisorInputSchema = z.object({
  supplier_id: z.string().uuid(),
  question: z.string().trim().min(10).max(600),
  demo_mode: z.boolean().default(false),
}).strict();
export type SupplierAdvisorInput = z.infer<typeof supplierAdvisorInputSchema>;

const citations = z.array(z.string().regex(/^E[1-8]$/)).min(1).max(8);
export const supplierAdviceSchema = z.object({
  assessment: z.string().trim().min(1).max(1000),
  assessment_evidence_ids: citations,
  risks: z.array(z.object({ text: z.string().trim().min(1).max(600), evidence_ids: citations }).strict()).max(4),
  actions: z.array(z.object({ text: z.string().trim().min(1).max(500), reason: z.string().trim().min(1).max(600), evidence_ids: citations }).strict()).min(1).max(5),
  questions_to_confirm: z.array(z.string().trim().min(1).max(300)).max(5),
}).strict();
export type SupplierAdvice = z.infer<typeof supplierAdviceSchema>;

export function hasValidEvidenceReferences(advice: SupplierAdvice, validIds: Set<string>): boolean {
  return [advice.assessment_evidence_ids, ...advice.risks.map((risk) => risk.evidence_ids), ...advice.actions.map((action) => action.evidence_ids)]
    .every((ids) => ids.length > 0 && ids.every((id) => validIds.has(id)));
}
