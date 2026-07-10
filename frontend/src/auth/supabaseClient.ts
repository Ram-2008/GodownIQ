import { createClient } from "@supabase/supabase-js";

/**
 * Auth-only client. Never call `.from(table)` on this — all business data goes
 * through the backend API so Postgres RLS + server-side role checks are the
 * single source of truth.
 */
export const supabaseAuth = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
