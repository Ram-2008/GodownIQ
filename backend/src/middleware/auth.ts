import { NextFunction, Request, Response } from "express";
import { getUserClient, supabaseAnon } from "../config/supabase";
import { asyncHandler } from "./asyncHandler";
import { ApiError, UnauthorizedError, ForbiddenError } from "./errors";
import { AuthenticatedProfile } from "../types/express";
import { Role } from "../types/domain";

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    throw new UnauthorizedError("Please sign in.");
  }

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  const userClient = getUserClient(token);
  const { data: profileRow, error: profileError } = await userClient
    .from("profiles")
    .select("id, full_name, role, whatsapp_number, approval_status")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profileRow) {
    throw new UnauthorizedError("No profile found for this account.");
  }

  const profile = profileRow as AuthenticatedProfile;
  if (profile.approval_status === "pending") {
    throw new ApiError(403, "Your account is awaiting owner approval.", { reason: "pending_approval" });
  }
  if (profile.approval_status === "rejected") {
    throw new ApiError(403, "Your account request was declined by the owner.", { reason: "rejected" });
  }
  if (profile.approval_status === "revoked") {
    throw new ApiError(403, "Your access has been revoked by the owner.", { reason: "revoked" });
  }

  req.accessToken = token;
  req.supabase = userClient;
  req.profile = profile;
  next();
});

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      throw new ForbiddenError("This section is restricted to " + roles.join(" or ") + ".");
    }
    next();
  };
}

export const requireOwner = requireRole("owner");
