import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  createPurchaseSchema,
  listPurchasesQuerySchema,
  updatePurchaseSchema,
} from "../validation/purchases";
import {
  createPurchase,
  getPurchaseById,
  listPurchases,
  markPurchasePaid,
  softDeletePurchase,
  updatePurchase,
} from "../services/purchaseService";
import { computeQuickChips } from "../services/quickChipService";

export const purchasesRouter = Router();

purchasesRouter.use(authenticate);

purchasesRouter.get(
  "/quick-chips",
  asyncHandler(async (req, res) => {
    const chips = await computeQuickChips(req.supabase!);
    res.json({ chips });
  })
);

purchasesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listPurchasesQuerySchema.parse(req.query);
    const result = await listPurchases(req.supabase!, {
      from: query.from,
      to: query.to,
      itemId: query.item_id,
      page: query.page,
      pageSize: query.page_size,
    });
    res.json(result);
  })
);

purchasesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const purchase = await getPurchaseById(req.supabase!, req.params.id);
    res.json({ purchase });
  })
);

purchasesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createPurchaseSchema.parse(req.body);
    const purchase = await createPurchase(req.supabase!, req.profile!, input);
    res.status(201).json({ purchase });
  })
);

purchasesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updatePurchaseSchema.parse(req.body);
    const purchase = await updatePurchase(req.supabase!, req.profile!, req.params.id, input);
    res.json({ purchase });
  })
);

purchasesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await softDeletePurchase(req.supabase!, req.profile!, req.params.id);
    res.status(204).send();
  })
);

purchasesRouter.post(
  "/:id/mark-paid",
  requireOwner,
  asyncHandler(async (req, res) => {
    const purchase = await markPurchasePaid(req.supabase!, req.profile!, req.params.id);
    res.json({ purchase });
  })
);
