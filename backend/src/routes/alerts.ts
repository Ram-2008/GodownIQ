import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errors";
import { supabaseAdmin } from "../config/supabase";
import { runDailyAlertChecks } from "../services/alertService";

export const alertsRouter = Router();

alertsRouter.use(authenticate);

alertsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase!.from("alerts").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new ApiError(500, error.message);
    res.json({ alerts: data });
  })
);

alertsRouter.patch(
  "/:id/dismiss",
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase!
      .from("alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error || !data) throw new ApiError(400, "Could not dismiss alert: " + (error?.message ?? "not found"));
    res.json({ alert: data });
  })
);

// Owner-only: manually trigger the overdue-payments + recurring-reminders sweep
// that otherwise only runs once a day, useful right after setup or for testing.
alertsRouter.post(
  "/run-daily-checks",
  requireOwner,
  asyncHandler(async (_req, res) => {
    await runDailyAlertChecks(supabaseAdmin);
    res.json({ ok: true });
  })
);
