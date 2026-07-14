-- General (non-purchase) operating expenses: rent, salaries, utilities, etc.
-- Run this in the Supabase SQL editor after 0001_init.sql and 0002_bill_photos.sql.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('rent', 'salaries', 'utilities', 'maintenance', 'transport', 'other')),
  description text not null,
  amount numeric not null check (amount >= 0),
  expense_date date not null,
  payment_status text not null default 'paid' check (payment_status in ('paid', 'pending')),
  payment_due_date date,
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index expenses_expense_date_idx on public.expenses (expense_date);
create index expenses_category_idx on public.expenses (category);
create index expenses_active_idx on public.expenses (id) where deleted_at is null;
create index expenses_payment_status_idx on public.expenses (payment_status) where deleted_at is null;

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create table public.expense_audit_log (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id),
  action text not null check (action in ('create', 'update', 'delete', 'payment_marked_paid')),
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);
create index expense_audit_log_expense_id_idx on public.expense_audit_log (expense_id);

-- =========================================================================
-- ROW LEVEL SECURITY (mirrors the purchases policies in 0001_init.sql)
-- =========================================================================

alter table public.expenses enable row level security;
alter table public.expense_audit_log enable row level security;

create policy expenses_owner_all on public.expenses for all
  using (public.is_owner()) with check (public.is_owner());
create policy expenses_staff_select on public.expenses for select
  using (public.current_role() = 'staff');
create policy expenses_staff_insert on public.expenses for insert
  with check (public.current_role() = 'staff' and created_by = auth.uid());
create policy expenses_staff_update_own_same_day on public.expenses for update
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

create policy expense_audit_log_owner_all on public.expense_audit_log for all
  using (public.is_owner()) with check (public.is_owner());
create policy expense_audit_log_staff_insert on public.expense_audit_log for insert
  with check (public.current_role() = 'staff' and changed_by = auth.uid());
