import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url({ message: "SUPABASE_URL must be a valid URL" }),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  GEMINI_API_KEY: z.string().optional().default(""),
  WHATSAPP_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_WHATSAPP_NUMBER: z.string().optional().default(""),
  PORT: z.string().optional().default("4000"),
  FRONTEND_URL: z.string().optional().default("http://localhost:5173"),
  NODE_ENV: z.string().optional().default("development"),
  // Only used on Vercel — validates that /api/cron/daily-alerts was called by Vercel Cron, not the public internet.
  CRON_SECRET: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Missing or invalid required environment variables. See backend/.env.example.");
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  FRONTEND_URLS: parsed.data.FRONTEND_URL.split(",").map((s) => s.trim()),
  isProduction: parsed.data.NODE_ENV === "production",
  geminiConfigured: parsed.data.GEMINI_API_KEY.length > 0,
  twilioConfigured:
    parsed.data.WHATSAPP_ENABLED &&
    parsed.data.TWILIO_ACCOUNT_SID.length > 0 &&
    parsed.data.TWILIO_AUTH_TOKEN.length > 0 &&
    parsed.data.TWILIO_WHATSAPP_NUMBER.length > 0,
};
