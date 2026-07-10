import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { BadRequestError } from "../middleware/errors";
import { stockAdjustmentSchema, stockOutSchema } from "../validation/stock";
import { getItemById } from "../services/itemsService";
import { getStockOverview, recordStockMovement } from "../services/stockService";
import { checkLowStock } from "../services/alertService";

export const stockRouter = Router();

stockRouter.use(authenticate);

stockRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const overview = await getStockOverview(req.supabase!);
    res.json({ items: overview });
  })
);

stockRouter.post(
  "/out",
  asyncHandler(async (req, res) => {
    const input = stockOutSchema.parse(req.body);
    const item = await getItemById(req.supabase!, input.item_id);
    if (!item.track_stock) throw new BadRequestError("This item does not have stock tracking enabled.");

    const movement = await recordStockMovement(req.supabase!, {
      itemId: input.item_id,
      type: "out",
      quantity: input.quantity,
      movementDate: input.movement_date,
      createdBy: req.profile!.id,
      note: input.note,
    });
    const updatedItem = await getItemById(req.supabase!, input.item_id);
    await checkLowStock(req.supabase!, updatedItem, updatedItem.current_stock ?? 0);
    res.status(201).json({ movement });
  })
);

stockRouter.post(
  "/adjustment",
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = stockAdjustmentSchema.parse(req.body);
    const item = await getItemById(req.supabase!, input.item_id);
    if (!item.track_stock) throw new BadRequestError("This item does not have stock tracking enabled.");

    const movement = await recordStockMovement(req.supabase!, {
      itemId: input.item_id,
      type: "adjustment",
      quantity: input.new_count,
      movementDate: input.movement_date,
      createdBy: req.profile!.id,
      note: input.note,
    });
    const updatedItem = await getItemById(req.supabase!, input.item_id);
    await checkLowStock(req.supabase!, updatedItem, updatedItem.current_stock ?? 0);
    res.status(201).json({ movement });
  })
);
