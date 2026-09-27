import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { incidentIdSchema } from "../validation/supplierIncidents";
import { createSupplierOutcomeSchema, listSupplierOutcomesSchema } from "../validation/supplierOutcomes";
import { createSupplierOutcome, listSupplierOutcomes, syncSupplierOutcome } from "../services/supplierOutcomeService";

export const supplierOutcomesRouter = Router();
supplierOutcomesRouter.use(authenticate, requireOwner);
supplierOutcomesRouter.get("/", asyncHandler(async (req, res) => {
  const query = listSupplierOutcomesSchema.parse(req.query);
  res.json(await listSupplierOutcomes(req.supabase!, query.supplier_id, query.demo_mode, query.page));
}));
supplierOutcomesRouter.post("/", asyncHandler(async (req, res) => {
  res.status(201).json({ outcome: await createSupplierOutcome(req.supabase!, req.profile!.id, createSupplierOutcomeSchema.parse(req.body)) });
}));
supplierOutcomesRouter.post("/:id/sync", rateLimit({
  windowMs: 60 * 60 * 1000, limit: 60, keyGenerator: (req) => req.profile!.id,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Outcome sync limit reached (60/hour). Your saved outcome is safe; try again later." },
}), asyncHandler(async (req, res) => {
  res.json(await syncSupplierOutcome(req.supabase!, incidentIdSchema.parse(req.params.id)));
}));
