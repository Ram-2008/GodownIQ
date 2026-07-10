import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { listPendingPayments } from "../services/paymentsService";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate, requireOwner);

paymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const summary = await listPendingPayments(req.supabase!);
    res.json(summary);
  })
);
