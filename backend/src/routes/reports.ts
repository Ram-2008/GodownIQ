import { Response, Router } from "express";
import { endOfMonth, format } from "date-fns";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { monthQuerySchema } from "../validation/reports";
import { exportPurchasesCsv, exportStockMovementsCsv, getMonthlyReport } from "../services/reportsService";

export const reportsRouter = Router();

reportsRouter.use(authenticate, requireOwner);

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

reportsRouter.get(
  "/monthly",
  asyncHandler(async (req, res) => {
    const { year, month } = monthQuerySchema.parse(req.query);
    const report = await getMonthlyReport(req.supabase!, year, month);
    res.json(report);
  })
);

reportsRouter.get(
  "/purchases.csv",
  asyncHandler(async (req, res) => {
    const { year, month } = monthQuerySchema.parse(req.query);
    const monthStartDate = new Date(year, month - 1, 1);
    const from = format(monthStartDate, "yyyy-MM-dd");
    const to = format(endOfMonth(monthStartDate), "yyyy-MM-dd");
    const csv = await exportPurchasesCsv(req.supabase!, { from, to });
    sendCsv(res, `purchases-${year}-${String(month).padStart(2, "0")}.csv`, csv);
  })
);

reportsRouter.get(
  "/purchases/backup.csv",
  asyncHandler(async (req, res) => {
    const csv = await exportPurchasesCsv(req.supabase!);
    sendCsv(res, "godowniq-full-backup.csv", csv);
  })
);

reportsRouter.get(
  "/stock-movements.csv",
  asyncHandler(async (req, res) => {
    const csv = await exportStockMovementsCsv(req.supabase!);
    sendCsv(res, "stock-movements.csv", csv);
  })
);
