import { Request, Router } from "express";
import { authenticate, requireOwner } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError, BadRequestError } from "../middleware/errors";
import { inviteStaffSchema, updateUserSchema } from "../validation/auth";
import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env";

export const authRouter = Router();

const USER_COLUMNS = "id, full_name, role, whatsapp_number, approval_status, created_at";

// Guards against an owner locking themselves out or removing the only owner account —
// revoke/delete are one-way (revoke can be undone via approve, delete cannot).
async function assertMutableTarget(req: Request, targetId: string): Promise<void> {
  if (targetId === req.profile!.id) {
    throw new BadRequestError("You can't do this to your own account.");
  }
  const { data, error } = await supabaseAdmin.from("profiles").select("role").eq("id", targetId).single();
  if (error || !data) throw new BadRequestError("User not found.");
  if (data.role === "owner") {
    throw new BadRequestError("You can't revoke or delete another owner's account.");
  }
}

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
    const { data, error } = await req.supabase!.from("profiles").select(USER_COLUMNS).order("created_at");
    if (error) throw new ApiError(500, error.message);
    res.json({ users: data });
  })
);

// Owner-only: approve a pending self-signup request. Uses supabaseAdmin because
// role/approval_status updates are revoked for the shared `authenticated` Postgres
// role (see 0004_staff_signup_approval.sql) — even the owner's own session can't
// touch these columns directly, by design.
authRouter.post(
  "/users/:id/approve",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: "approved" })
      .eq("id", req.params.id)
      .select(USER_COLUMNS)
      .single();
    if (error || !data) throw new ApiError(400, "Could not approve this user: " + (error?.message ?? "not found"));
    res.json({ user: data });
  })
);

// Owner-only: reject a pending self-signup request.
authRouter.post(
  "/users/:id/reject",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: "rejected" })
      .eq("id", req.params.id)
      .select(USER_COLUMNS)
      .single();
    if (error || !data) throw new ApiError(400, "Could not reject this user: " + (error?.message ?? "not found"));
    res.json({ user: data });
  })
);

// Owner-only: revoke an already-approved user's access (distinct from rejecting a
// pending request — this pulls access from someone who was previously active).
authRouter.post(
  "/users/:id/revoke",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    await assertMutableTarget(req, req.params.id);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: "revoked" })
      .eq("id", req.params.id)
      .select(USER_COLUMNS)
      .single();
    if (error || !data) throw new ApiError(400, "Could not revoke this user's access: " + (error?.message ?? "not found"));
    res.json({ user: data });
  })
);

// Owner-only: update a staff/owner profile's name or WhatsApp number.
authRouter.patch(
  "/users/:id",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    const input = updateUserSchema.parse(req.body);
    const { data, error } = await req.supabase!.from("profiles").update(input).eq("id", req.params.id).select(USER_COLUMNS).single();
    if (error || !data) throw new ApiError(400, "Could not update this user: " + (error?.message ?? "not found"));
    res.json({ user: data });
  })
);

// Owner-only: permanently delete a user (auth.users row, cascading to their profile).
// Blocked by the database itself if they have purchase/expense/stock history, since
// those tables reference profiles.id with no cascade — revoke access instead for those.
authRouter.delete(
  "/users/:id",
  authenticate,
  requireOwner,
  asyncHandler(async (req, res) => {
    await assertMutableTarget(req, req.params.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) {
      throw new BadRequestError(
        "Could not delete this user — they likely have purchase or expense history. Revoke their access instead."
      );
    }
    res.status(204).send();
  })
);
