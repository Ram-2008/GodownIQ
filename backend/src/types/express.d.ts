import { SupabaseClient } from "@supabase/supabase-js";

export interface AuthenticatedProfile {
  id: string;
  full_name: string;
  role: "owner" | "staff";
  whatsapp_number: string | null;
}

declare global {
  namespace Express {
    interface Request {
      accessToken?: string;
      profile?: AuthenticatedProfile;
      supabase?: SupabaseClient;
    }
  }
}

export {};
