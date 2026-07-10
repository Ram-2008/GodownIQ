import { Router } from "express";
import { z } from "zod";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { listAuditLog } from "../services/auditLogService";

export const auditLogRouter = Router();

auditLogRouter.use(authenticate, requireOwner);

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(200).default(50),
});

auditLogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, page_size } = querySchema.parse(req.query);
    const result = await listAuditLog(req.supabase!, page, page_size);
    res.json(result);
  })
);
