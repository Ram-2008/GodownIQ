import cron from "node-cron";
import { supabaseAdmin } from "../config/supabase";
import { runDailyAlertChecks } from "../services/alertService";

/** Runs once a day at 06:00 server time — overdue payments and recurring-purchase reminders. */
export function scheduleDailyJobs(): void {
  cron.schedule("0 6 * * *", () => {
    runDailyAlertChecks(supabaseAdmin).catch((err) => console.error("Daily alert check failed:", err));
  });
}
