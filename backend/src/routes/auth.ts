import { Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError, BadRequestError } from "../middleware/errors";
import { inviteStaffSchema, updateUserSchema } from "../validation/auth";
import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";

export const authRouter = Router();

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ profile: req.profile });
  })
);

// Owner-only: invite a staff member by email via Supabase's built-in transactional email.
authRouter.post(
  "/invite-staff",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = inviteStaffSchema.parse(req.body);

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.full_name },
      redirectTo: env.FRONTEND_URLS[0],
    });

    if (error || !data.user) {
      throw new ApiError(502, error?.message ?? "Could not send the invite email.");
    }

    if (input.whatsapp_number) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ whatsapp_number: input.whatsapp_number })
        .eq("id", data.user.id);
      if (updateError) {
        throw new BadRequestError("Invite sent, but saving the WhatsApp number failed: " + updateError.message);
      }
    }

    res.status(201).json({ invited: { id: data.user.id, email: input.email, full_name: input.full_name } });
  })
);

// Owner-only: list all staff/owner profiles for the user-management page.
authRouter.get(
  "/users",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { data, error } = await req.supabase!.from("profiles").select("id, full_name, role, whatsapp_number, created_at").order("created_at");
    if (error) throw new ApiError(500, error.message);
    res.json({ users: data });
  })
);

// Owner-only: update a staff/owner profile's name or WhatsApp number.
authRouter.patch(
  "/users/:id",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const { data, error } = await req.supabase!
      .from("profiles")
      .update(input)
      .eq("id", req.params.id)
      .select("id, full_name, role, whatsapp_number, created_at")
      .single();
    if (error || !data) throw new ApiError(400, "Could not update this user: " + (error?.message ?? "not found"));
    res.json({ user: data });
  })
);
