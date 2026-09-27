import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { supplierAdvisorInputSchema } from "../validation/supplierAdvisor";
import { adviseSupplier } from "../services/supplierAdvisorService";

export const supplierAdvisorRouter = Router();
supplierAdvisorRouter.use(authenticate, requireOwner);
supplierAdvisorRouter.post("/", rateLimit({
  windowMs: 60 * 60 * 1000, limit: 30, keyGenerator: (req) => req.profile!.id,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Advisor limit reached (30/hour). Please try again later." },
}), asyncHandler(async (req, res) => {
  res.json(await adviseSupplier(req.supabase!, supplierAdvisorInputSchema.parse(req.body)));
}));
