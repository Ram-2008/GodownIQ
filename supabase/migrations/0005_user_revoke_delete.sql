-- Let the owner revoke an already-approved user's access (distinct from rejecting a
-- pending request) and, separately, hard-delete a user via the Supabase Admin API.
-- Run this in the Supabase SQL editor after 0004_staff_signup_approval.sql.

alter table public.profiles drop constraint if exists profiles_approval_status_check;
alter table public.profiles add constraint profiles_approval_status_check
  check (approval_status in ('pending', 'approved', 'rejected', 'revoked'));

-- 'revoked' is just another non-'approved' value, so it's covered for free by the
-- current_role()/is_owner() choke point added in 0004 — no further RLS changes needed.
