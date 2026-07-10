import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { getSupplierComparison } from "../services/supplierComparisonService";

export const supplierComparisonRouter = Router();

supplierComparisonRouter.use(authenticate, requireOwner);

supplierComparisonRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await getSupplierComparison(req.supabase!);
    res.json(result);
  })
);
