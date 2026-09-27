import { api } from "./client";

export interface AdvisorEvidence {
  id: string; source_type: "incident" | "outcome"; source_id: string; related_incident_id: string;
  event_date: string; category: string; action_taken: string | null; outcome_status: string | null;
  description: string; resolution: string | null; resolved_date: string | null;
  is_demo: boolean; memory_ids: string[]; note: string | null;
}
export interface AdvisorResponse {
  status: "ready" | "no_memory" | "memory_unavailable" | "ai_unavailable";
  supplier: { id: string; name: string }; question: string; demo_mode: boolean;
  generated_at: string; warning: string | null; baseline: string[]; evidence: AdvisorEvidence[];
  advice: null | {
    assessment: string; assessment_evidence_ids: string[];
    risks: { text: string; evidence_ids: string[] }[];
    actions: { text: string; reason: string; evidence_ids: string[] }[];
    questions_to_confirm: string[];
  };
}
export const supplierAdvisorApi = {
  ask: (supplier_id: string, question: string, demo_mode: boolean) =>
    api.post<AdvisorResponse>("/supplier-advisor", { supplier_id, question, demo_mode }),
};
