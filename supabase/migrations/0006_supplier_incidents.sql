-- Apply after migrations 0001 through 0005. One warehouse per deployment.
begin;
create table public.supplier_incidents (
  id uuid primary key,
  supplier_id uuid not null references public.suppliers(id),
  supplier_name text not null,
  incident_date date not null,
  incident_type text not null check (incident_type in ('late_delivery', 'shortage', 'damage', 'other')),
  description text not null check (length(trim(description)) between 10 and 3000),
  resolution text check (length(trim(resolution)) between 3 and 2000),
  resolved_date date,
  is_demo boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  memory_status text not null default 'pending' check (memory_status in ('pending', 'synced')),
  memory_synced_at timestamptz,
  memory_bank_id text,
  constraint resolution_date_pair check ((resolution is null) = (resolved_date is null)),
  constraint resolution_after_incident check (resolved_date is null or resolved_date >= incident_date)
);
create index supplier_incidents_supplier_date_idx on public.supplier_incidents(supplier_id, incident_date desc);
alter table public.supplier_incidents enable row level security;
create policy supplier_incidents_owner_select on public.supplier_incidents for select to authenticated
  using (public.is_owner());
create policy supplier_incidents_owner_insert on public.supplier_incidents for insert to authenticated
  with check (public.is_owner() and created_by = auth.uid());
create policy supplier_incidents_owner_sync on public.supplier_incidents for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
-- Immutable incident content; the API only updates memory synchronization fields.
revoke all on public.supplier_incidents from anon, authenticated;
grant select, insert on public.supplier_incidents to authenticated;
grant update (memory_status, memory_synced_at, memory_bank_id) on public.supplier_incidents to authenticated;
commit;
