-- Staff self-signup with owner approval.
-- Run this in the Supabase SQL editor after 0001_init.sql, 0002_bill_photos.sql, and 0003_expenses.sql.

alter table public.profiles add column approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'rejected'));

-- Decide pending vs approved from `invited_at`, a server-set column GoTrue only populates
-- for the existing admin.inviteUserByEmail path — never something a client can spoof via
-- the public signUp() call. Every self-signup (owner bootstrap included) now lands pending.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, approval_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'staff',
    case when new.invited_at is not null then 'approved' else 'pending' end
  );
  return new;
end;
$$;

-- Single choke point: every _staff_*/is_owner() RLS policy calls through current_role(),
-- so a pending/rejected caller now fails every one of those checks automatically.
create or replace function public.current_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and approval_status = 'approved';
$$;

-- Owner and staff share the single Postgres `authenticated` role, so without this, any
-- signed-in user could PATCH their own profiles row directly via PostgREST and set
-- role/approval_status themselves, bypassing the Express-layer whitelist entirely.
revoke update (role, approval_status) on public.profiles from authenticated;
