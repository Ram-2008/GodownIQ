import { Router } from "express";
import { subMonths } from "date-fns";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { comparisonQuerySchema } from "../validation/comparison";
import { getMonthlyComparison } from "../services/comparisonService";

export const comparisonRouter = Router();

comparisonRouter.use(authenticate, requireOwner);

comparisonRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = comparisonQuerySchema.parse(req.query);
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    const period2 = { year: query.year2 ?? now.getFullYear(), month: query.month2 ?? now.getMonth() + 1 };
    const period1 = { year: query.year1 ?? lastMonth.getFullYear(), month: query.month1 ?? lastMonth.getMonth() + 1 };

    const result = await getMonthlyComparison(req.supabase!, period1, period2);
    res.json(result);
  })
);
