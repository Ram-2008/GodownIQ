import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { getDashboardSummary } from "../services/dashboardService";
import { getItemDetail } from "../services/itemDetailService";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const summary = await getDashboardSummary(req.supabase!);
    res.json(summary);
  })
);

dashboardRouter.get(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const detail = await getItemDetail(req.supabase!, req.params.id);
    res.json(detail);
  })
);
