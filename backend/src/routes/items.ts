import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errors";
import { createItemSchema, updateItemSchema } from "../validation/items";
import { createItem, listItems } from "../services/itemsService";

export const itemsRouter = Router();

itemsRouter.use(authenticate);

itemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await listItems(req.supabase!);
    res.json({ items });
  })
);

itemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createItemSchema.parse(req.body);
    const item = await createItem(req.supabase!, input.name, input.default_unit);
    res.status(201).json({ item });
  })
);

itemsRouter.patch(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = updateItemSchema.parse(req.body);
    const { data, error } = await req.supabase!.from("items").update(input).eq("id", req.params.id).select("*").single();
    if (error || !data) throw new ApiError(400, "Could not update item: " + (error?.message ?? "not found"));
    res.json({ item: data });
  })
);
