import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { createSupplierIncidentSchema, incidentIdSchema, incidentListSchema } from "../validation/supplierIncidents";
import { createSupplierIncident, listSupplierIncidents, syncSupplierIncident } from "../services/supplierIncidentService";

export const supplierIncidentsRouter = Router();
supplierIncidentsRouter.use(authenticate, requireOwner);
const syncLimit = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 60,
  keyGenerator: (req) => req.profile!.id,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Memory sync limit reached (60/hour). Your saved incidents are safe; try again later." },
});
supplierIncidentsRouter.get("/", asyncHandler(async (req, res) => {
  const { page } = incidentListSchema.parse(req.query);
  res.json(await listSupplierIncidents(req.supabase!, page));
}));
supplierIncidentsRouter.post("/", asyncHandler(async (req, res) => {
  const input = createSupplierIncidentSchema.parse(req.body);
  res.status(201).json({ incident: await createSupplierIncident(req.supabase!, req.profile!.id, input) });
}));
supplierIncidentsRouter.post("/:id/sync", syncLimit, asyncHandler(async (req, res) => {
  res.json(await syncSupplierIncident(req.supabase!, incidentIdSchema.parse(req.params.id)));
}));
