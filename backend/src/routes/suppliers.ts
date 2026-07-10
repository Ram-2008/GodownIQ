import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errors";
import { createSupplierSchema, updateSupplierSchema } from "../validation/suppliers";
import { createSupplier, listSuppliers } from "../services/suppliersService";

export const suppliersRouter = Router();

suppliersRouter.use(authenticate);

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const suppliers = await listSuppliers(req.supabase!);
    res.json({ suppliers });
  })
);

suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSupplierSchema.parse(req.body);
    const supplier = await createSupplier(req.supabase!, input.name, input.phone);
    res.status(201).json({ supplier });
  })
);

suppliersRouter.patch(
  "/:id",
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = updateSupplierSchema.parse(req.body);
    const { data, error } = await req.supabase!.from("suppliers").update(input).eq("id", req.params.id).select("*").single();
    if (error || !data) throw new ApiError(400, "Could not update supplier: " + (error?.message ?? "not found"));
    res.json({ supplier: data });
  })
);
