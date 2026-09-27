-- Run once after 0006. Outcomes are owner-reported observations, not guarantees.
begin;
create table public.supplier_outcomes (
  id uuid primary key,
  supplier_id uuid not null references public.suppliers(id),
  supplier_name text not null,
  related_incident_id uuid not null references public.supplier_incidents(id),
  action_taken text not null check (length(trim(action_taken)) between 10 and 2000),
  outcome_status text not null check (outcome_status in ('worked', 'partly_worked', 'did_not_work')),
  result_details text not null check (length(trim(result_details)) between 10 and 3000),
  outcome_date date not null,
  is_demo boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  memory_status text not null default 'pending' check (memory_status in ('pending', 'synced')),
  memory_synced_at timestamptz,
  memory_bank_id text
);
create index supplier_outcomes_supplier_date_idx on public.supplier_outcomes(supplier_id, outcome_date desc);
alter table public.supplier_outcomes enable row level security;
create policy supplier_outcomes_owner_select on public.supplier_outcomes for select to authenticated
  using (public.is_owner());
create policy supplier_outcomes_owner_insert on public.supplier_outcomes for insert to authenticated
  with check (
    public.is_owner() and created_by = auth.uid()
    and exists (
      select 1 from public.supplier_incidents i where i.id = related_incident_id
      and i.supplier_id = supplier_outcomes.supplier_id and i.is_demo = supplier_outcomes.is_demo
      and i.incident_date <= supplier_outcomes.outcome_date
    )
    and outcome_date <= (now() at time zone 'Asia/Kolkata')::date
  );
create policy supplier_outcomes_owner_sync on public.supplier_outcomes for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
revoke all on public.supplier_outcomes from anon, authenticated;
grant select, insert on public.supplier_outcomes to authenticated;
grant update (memory_status, memory_synced_at, memory_bank_id) on public.supplier_outcomes to authenticated;
commit;
