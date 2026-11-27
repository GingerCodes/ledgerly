create table if not exists public.finance_revisions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision integer not null default 0 check (revision >= 0)
);

create table if not exists public.finance_accounts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  type text not null check (type in ('cash', 'savings')),
  institution text not null default '',
  account_number text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  opening_date date not null,
  opening_balance_paise bigint not null default 0 check (opening_balance_paise >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create table if not exists public.finance_categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  parent_category_id text,
  active boolean not null default true,
  primary key (user_id, id),
  foreign key (user_id, parent_category_id)
    references public.finance_categories (user_id, id)
    on delete cascade deferrable initially deferred
);

create table if not exists public.finance_transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  account_id text,
  from_account_id text,
  to_account_id text,
  description text not null,
  amount_paise bigint not null check (amount_paise > 0),
  category_id text,
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, account_id) references public.finance_accounts (user_id, id),
  foreign key (user_id, from_account_id) references public.finance_accounts (user_id, id),
  foreign key (user_id, to_account_id) references public.finance_accounts (user_id, id),
  foreign key (user_id, category_id) references public.finance_categories (user_id, id),
  check (
    (type = 'transfer'
      and account_id is null
      and from_account_id is not null
      and to_account_id is not null
      and from_account_id <> to_account_id
      and category_id is null)
    or
    (type in ('expense', 'income')
      and account_id is not null
      and from_account_id is null
      and to_account_id is null)
  ),
  check (type <> 'expense' or account_id = 'CASH')
);

create index if not exists finance_transactions_by_date
  on public.finance_transactions (user_id, date desc);
create index if not exists finance_transactions_by_category_date
  on public.finance_transactions (user_id, category_id, date desc);
create index if not exists finance_transactions_by_account_date
  on public.finance_transactions (user_id, account_id, date desc);

create table if not exists public.finance_fixed_deposits (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  institution text not null,
  account_number text not null,
  principal_paise bigint not null check (principal_paise > 0),
  start_date date not null,
  maturity_date date not null,
  annual_rate_basis_points integer not null check (annual_rate_basis_points >= 0),
  interest_type text not null check (interest_type in ('simple', 'compound')),
  compounds_per_year integer not null check (compounds_per_year between 1 and 365),
  linked_account_id text,
  maturity_instruction text not null default '',
  status text not null default 'active' check (status in ('active', 'matured', 'closed')),
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, linked_account_id) references public.finance_accounts (user_id, id),
  check (maturity_date >= start_date)
);

create table if not exists public.finance_balance_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  account_id text not null,
  date date not null,
  reported_balance_paise bigint not null check (reported_balance_paise >= 0),
  source text not null,
  notes text not null default '',
  created_at timestamptz not null,
  primary key (user_id, id),
  foreign key (user_id, account_id) references public.finance_accounts (user_id, id)
);

create index if not exists finance_snapshots_by_account_date
  on public.finance_balance_snapshots (user_id, account_id, date desc);

create table if not exists public.finance_transaction_changes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  transaction_id text not null,
  changed_at timestamptz not null,
  reason text not null default '',
  changed_fields_json text not null,
  primary key (user_id, id),
  foreign key (user_id, transaction_id)
    references public.finance_transactions (user_id, id) on delete cascade
);

alter table public.finance_revisions enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_fixed_deposits enable row level security;
alter table public.finance_balance_snapshots enable row level security;
alter table public.finance_transaction_changes enable row level security;

do $policies$
declare
  table_name text;
begin
  foreach table_name in array array[
    'finance_revisions',
    'finance_accounts',
    'finance_categories',
    'finance_transactions',
    'finance_fixed_deposits',
    'finance_balance_snapshots',
    'finance_transaction_changes'
  ]
  loop
    execute format(
      'drop policy if exists "Users manage their own finance data" on public.%I',
      table_name
    );
    execute format(
      'create policy "Users manage their own finance data" on public.%I
       for all to authenticated
       using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))',
      table_name
    );
  end loop;
end
$policies$;

revoke all on
  public.finance_revisions,
  public.finance_accounts,
  public.finance_categories,
  public.finance_transactions,
  public.finance_fixed_deposits,
  public.finance_balance_snapshots,
  public.finance_transaction_changes
from anon, authenticated;

create or replace function public.finance_load_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_revision integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  insert into public.finance_revisions (user_id, revision)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select revision into current_revision
  from public.finance_revisions
  where user_id = current_user_id;

  return jsonb_build_object(
    'revision', current_revision,
    'accounts', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_accounts as row_data where user_id = current_user_id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_categories as row_data where user_id = current_user_id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_transactions as row_data where user_id = current_user_id), '[]'::jsonb),
    'fixed_deposits', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_fixed_deposits as row_data where user_id = current_user_id), '[]'::jsonb),
    'balance_snapshots', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_balance_snapshots as row_data where user_id = current_user_id), '[]'::jsonb),
    'transaction_changes', coalesce((select jsonb_agg(to_jsonb(row_data) - 'user_id') from public.finance_transaction_changes as row_data where user_id = current_user_id), '[]'::jsonb)
  );
end
$function$;

create or replace function public.finance_apply_changes(
  expected_revision integer,
  changes jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  next_revision integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  update public.finance_revisions
  set revision = revision + 1
  where user_id = current_user_id
    and revision = expected_revision
  returning revision into next_revision;

  if next_revision is null then
    raise exception 'FINANCE_CONFLICT: data changed in another session. Reload before saving.';
  end if;

  insert into public.finance_accounts (
    user_id, id, name, type, institution, account_number, status, opening_date,
    opening_balance_paise, created_at, updated_at
  )
  select current_user_id, item.id, item.name, item.type, item.institution, item.account_number,
    item.status, item.opening_date, item.opening_balance_paise, item.created_at, item.updated_at
  from jsonb_to_recordset(coalesce(changes #> '{accounts,upsert}', '[]'::jsonb)) as item(
    id text, name text, type text, institution text, account_number text, status text,
    opening_date date, opening_balance_paise bigint, created_at timestamptz, updated_at timestamptz
  )
  on conflict (user_id, id) do update set
    name = excluded.name, type = excluded.type, institution = excluded.institution,
    account_number = excluded.account_number, status = excluded.status,
    opening_date = excluded.opening_date, opening_balance_paise = excluded.opening_balance_paise,
    created_at = excluded.created_at, updated_at = excluded.updated_at;

  insert into public.finance_categories (user_id, id, name, parent_category_id, active)
  select current_user_id, item.id, item.name, item.parent_category_id, item.active
  from jsonb_to_recordset(coalesce(changes #> '{categories,upsert}', '[]'::jsonb)) as item(
    id text, name text, parent_category_id text, active boolean
  )
  on conflict (user_id, id) do update set
    name = excluded.name, parent_category_id = excluded.parent_category_id, active = excluded.active;

  insert into public.finance_transactions (
    user_id, id, date, type, account_id, from_account_id, to_account_id,
    description, amount_paise, category_id, notes, created_at, updated_at
  )
  select current_user_id, item.id, item.date, item.type, item.account_id, item.from_account_id,
    item.to_account_id, item.description, item.amount_paise, item.category_id, item.notes,
    item.created_at, item.updated_at
  from jsonb_to_recordset(coalesce(changes #> '{transactions,upsert}', '[]'::jsonb)) as item(
    id text, date date, type text, account_id text, from_account_id text, to_account_id text,
    description text, amount_paise bigint, category_id text, notes text,
    created_at timestamptz, updated_at timestamptz
  )
  on conflict (user_id, id) do update set
    date = excluded.date, type = excluded.type, account_id = excluded.account_id,
    from_account_id = excluded.from_account_id, to_account_id = excluded.to_account_id,
    description = excluded.description, amount_paise = excluded.amount_paise,
    category_id = excluded.category_id, notes = excluded.notes,
    created_at = excluded.created_at, updated_at = excluded.updated_at;

  insert into public.finance_fixed_deposits (
    user_id, id, institution, account_number, principal_paise, start_date, maturity_date,
    annual_rate_basis_points, interest_type, compounds_per_year, linked_account_id,
    maturity_instruction, status, notes, created_at, updated_at
  )
  select current_user_id, item.id, item.institution, item.account_number, item.principal_paise,
    item.start_date, item.maturity_date, item.annual_rate_basis_points, item.interest_type,
    item.compounds_per_year, item.linked_account_id, item.maturity_instruction, item.status,
    item.notes, item.created_at, item.updated_at
  from jsonb_to_recordset(coalesce(changes #> '{fixed_deposits,upsert}', '[]'::jsonb)) as item(
    id text, institution text, account_number text, principal_paise bigint, start_date date,
    maturity_date date, annual_rate_basis_points integer, interest_type text,
    compounds_per_year integer, linked_account_id text, maturity_instruction text,
    status text, notes text, created_at timestamptz, updated_at timestamptz
  )
  on conflict (user_id, id) do update set
    institution = excluded.institution, account_number = excluded.account_number,
    principal_paise = excluded.principal_paise, start_date = excluded.start_date,
    maturity_date = excluded.maturity_date, annual_rate_basis_points = excluded.annual_rate_basis_points,
    interest_type = excluded.interest_type, compounds_per_year = excluded.compounds_per_year,
    linked_account_id = excluded.linked_account_id, maturity_instruction = excluded.maturity_instruction,
    status = excluded.status, notes = excluded.notes, created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  insert into public.finance_balance_snapshots (
    user_id, id, account_id, date, reported_balance_paise, source, notes, created_at
  )
  select current_user_id, item.id, item.account_id, item.date, item.reported_balance_paise,
    item.source, item.notes, item.created_at
  from jsonb_to_recordset(coalesce(changes #> '{balance_snapshots,upsert}', '[]'::jsonb)) as item(
    id text, account_id text, date date, reported_balance_paise bigint, source text,
    notes text, created_at timestamptz
  )
  on conflict (user_id, id) do update set
    account_id = excluded.account_id, date = excluded.date,
    reported_balance_paise = excluded.reported_balance_paise, source = excluded.source,
    notes = excluded.notes, created_at = excluded.created_at;

  insert into public.finance_transaction_changes (
    user_id, id, transaction_id, changed_at, reason, changed_fields_json
  )
  select current_user_id, item.id, item.transaction_id, item.changed_at, item.reason,
    item.changed_fields_json
  from jsonb_to_recordset(coalesce(changes #> '{transaction_changes,upsert}', '[]'::jsonb)) as item(
    id text, transaction_id text, changed_at timestamptz, reason text,
    changed_fields_json text
  )
  on conflict (user_id, id) do update set
    transaction_id = excluded.transaction_id, changed_at = excluded.changed_at,
    reason = excluded.reason, changed_fields_json = excluded.changed_fields_json;

  delete from public.finance_transaction_changes where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{transaction_changes,delete}', '[]'::jsonb)));
  delete from public.finance_balance_snapshots where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{balance_snapshots,delete}', '[]'::jsonb)));
  delete from public.finance_fixed_deposits where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{fixed_deposits,delete}', '[]'::jsonb)));
  delete from public.finance_transactions where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{transactions,delete}', '[]'::jsonb)));
  delete from public.finance_categories where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{categories,delete}', '[]'::jsonb)));
  delete from public.finance_accounts where user_id = current_user_id
    and id in (select value from jsonb_array_elements_text(coalesce(changes #> '{accounts,delete}', '[]'::jsonb)));

  return next_revision;
end
$function$;

revoke all on function public.finance_load_snapshot() from public;
revoke all on function public.finance_apply_changes(integer, jsonb) from public;
grant execute on function public.finance_load_snapshot() to authenticated;
grant execute on function public.finance_apply_changes(integer, jsonb) to authenticated;
