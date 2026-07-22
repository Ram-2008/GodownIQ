import { Router } from "express";
import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { runDailyAlertChecks } from "../services/alertService";
import { asyncHandler } from "../middleware/asyncHandler";

export const cronRouter = Router();

// Triggered by Vercel Cron (see vercel.json) instead of node-cron, which can't run
// on serverless. Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`
// when that env var is set — reject anything else so this endpoint isn't public.
cronRouter.get(
  "/daily-alerts",
  asyncHandler(async (req, res) => {
    // Fail closed: without a configured secret, nothing can legitimately call this route
    // (node-cron handles the job directly on Railway/Render/local instead), so reject.
    if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await runDailyAlertChecks(supabaseAdmin);
    res.status(200).json({ ok: true });
  })
);
