-- GodownIQ initial schema + RLS
-- Run this in the Supabase SQL editor (or `supabase db push` with the CLI) on a fresh project.

create extension if not exists "pgcrypto";

-- =========================================================================
-- TABLES
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  whatsapp_number text,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text not null check (default_unit in ('kg', 'litre', 'pieces', 'bags', 'quintal')),
  track_stock boolean not null default false,
  current_stock numeric,
  low_stock_threshold numeric,
  created_at timestamptz not null default now()
);
create unique index items_name_lower_idx on public.items (lower(name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create unique index suppliers_name_lower_idx on public.suppliers (lower(name));

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id),
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('kg', 'litre', 'pieces', 'bags', 'quintal')),
  unit_price numeric not null check (unit_price >= 0),
  total_amount numeric not null check (total_amount >= 0),
  purchase_date date not null,
  supplier_id uuid references public.suppliers (id),
  invoice_number text,
  gst_amount numeric,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending')),
  payment_due_date date,
  note text,
  entry_source text not null check (entry_source in ('form', 'quick_chip', 'nl_text', 'whatsapp', 'photo')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index purchases_purchase_date_idx on public.purchases (purchase_date);
create index purchases_item_id_idx on public.purchases (item_id);
create index purchases_supplier_id_idx on public.purchases (supplier_id);
create index purchases_active_idx on public.purchases (id) where deleted_at is null;
create index purchases_payment_status_idx on public.purchases (payment_status) where deleted_at is null;

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id),
  type text not null check (type in ('in', 'out', 'adjustment')),
  quantity numeric not null,
  movement_date date not null,
  purchase_id uuid references public.purchases (id),
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index stock_movements_item_id_idx on public.stock_movements (item_id);
create index stock_movements_date_idx on public.stock_movements (movement_date);

create table public.purchase_audit_log (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id),
  action text not null check (action in ('create', 'update', 'delete', 'payment_marked_paid')),
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);
create index purchase_audit_log_purchase_id_idx on public.purchase_audit_log (purchase_id);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('price_anomaly', 'low_stock', 'payment_overdue', 'reorder_reminder')),
  message text not null,
  related_id uuid,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);
create index alerts_dismissed_at_idx on public.alerts (dismissed_at);
create index alerts_type_idx on public.alerts (type);

create table public.forecasts_cache (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  payload jsonb not null
);

-- =========================================================================
-- TRIGGERS: updated_at maintenance
-- =========================================================================

create function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

-- =========================================================================
-- TRIGGER: auto-create profile row on signup
-- =========================================================================

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'staff'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- TRIGGER: maintain items.current_stock from stock_movements
-- =========================================================================

create function public.apply_stock_movement() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'in' then
    update public.items set current_stock = coalesce(current_stock, 0) + new.quantity where id = new.item_id;
  elsif new.type = 'out' then
    update public.items set current_stock = coalesce(current_stock, 0) - new.quantity where id = new.item_id;
  elsif new.type = 'adjustment' then
    update public.items set current_stock = new.quantity where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- =========================================================================
-- HELPER: current caller's role, bypasses RLS recursion via security definer
-- =========================================================================

create function public.current_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_owner() returns boolean
  language sql stable security definer set search_path = public as $$
  select public.current_role() = 'owner';
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_audit_log enable row level security;
alter table public.alerts enable row level security;
alter table public.forecasts_cache enable row level security;

-- profiles: owner sees/edits everyone; everyone sees/edits their own row
create policy profiles_owner_all on public.profiles for all
  using (public.is_owner()) with check (public.is_owner());
create policy profiles_self_select on public.profiles for select
  using (id = auth.uid());
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- items: owner full access; staff can read + create-if-new (no update/delete)
create policy items_owner_all on public.items for all
  using (public.is_owner()) with check (public.is_owner());
create policy items_staff_select on public.items for select
  using (public.current_role() = 'staff');
create policy items_staff_insert on public.items for insert
  with check (public.current_role() = 'staff');

-- suppliers: owner full access; staff can read + create-if-new (no update/delete)
create policy suppliers_owner_all on public.suppliers for all
  using (public.is_owner()) with check (public.is_owner());
create policy suppliers_staff_select on public.suppliers for select
  using (public.current_role() = 'staff');
create policy suppliers_staff_insert on public.suppliers for insert
  with check (public.current_role() = 'staff');

-- purchases: owner full access; staff can read all (dashboard/calendar), insert own,
-- and update only their own same-day entries (edits + soft deletes both go through UPDATE)
create policy purchases_owner_all on public.purchases for all
  using (public.is_owner()) with check (public.is_owner());
create policy purchases_staff_select on public.purchases for select
  using (public.current_role() = 'staff');
create policy purchases_staff_insert on public.purchases for insert
  with check (public.current_role() = 'staff' and created_by = auth.uid());
create policy purchases_staff_update_own_same_day on public.purchases for update
  using (
    public.current_role() = 'staff'
    and created_by = auth.uid()
    and created_at::date = current_date
  )
  with check (
    public.current_role() = 'staff'
    and created_by = auth.uid()
    and created_at::date = current_date
  );

-- stock_movements: owner full access; staff can read all + insert their own
create policy stock_movements_owner_all on public.stock_movements for all
  using (public.is_owner()) with check (public.is_owner());
create policy stock_movements_staff_select on public.stock_movements for select
  using (public.current_role() = 'staff');
create policy stock_movements_staff_insert on public.stock_movements for insert
  with check (public.current_role() = 'staff' and created_by = auth.uid());

-- purchase_audit_log: owner only
create policy purchase_audit_log_owner_all on public.purchase_audit_log for all
  using (public.is_owner()) with check (public.is_owner());
-- staff must still be able to write an audit row for their own purchase actions
create policy purchase_audit_log_staff_insert on public.purchase_audit_log for insert
  with check (public.current_role() = 'staff' and changed_by = auth.uid());

-- alerts: owner full access; staff can read + dismiss (dashboard alerts panel)
create policy alerts_owner_all on public.alerts for all
  using (public.is_owner()) with check (public.is_owner());
create policy alerts_staff_select on public.alerts for select
  using (public.current_role() = 'staff');
create policy alerts_staff_dismiss on public.alerts for update
  using (public.current_role() = 'staff')
  with check (public.current_role() = 'staff');

-- forecasts_cache: owner only
create policy forecasts_cache_owner_all on public.forecasts_cache for all
  using (public.is_owner()) with check (public.is_owner());
