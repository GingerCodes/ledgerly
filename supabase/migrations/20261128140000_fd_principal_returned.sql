-- A deposit with no source account (for example an FD that started before the user began using Ledgerly) can
-- add its principal to the receiving account when it is closed. This records that choice per deposit.
-- DEPLOY THE APP FIRST, then run this (the new app sends client_api_version 5; until this runs the flag is not
-- stored on the server). Run after 20261128130000_fd_interest_payout.sql. It also raises the minimum app version to 5.
alter table public.finance_fixed_deposits add column if not exists principal_returned boolean not null default false;

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

  -- Older cached copies of the app do not send this and would overwrite columns they do not know about.
  if coalesce((changes ->> 'client_api_version')::integer, 0) < 5 then
    raise exception 'FINANCE_OUTDATED: This version of Ledgerly is out of date. Reload the page to update.';
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
    funding_account_id, maturity_instruction, status, closed_date, principal_returned, notes, created_at, updated_at
  )
  select current_user_id, item.id, item.institution, item.account_number, item.principal_paise,
    item.start_date, item.maturity_date, item.annual_rate_basis_points, item.interest_type,
    item.compounds_per_year, item.linked_account_id, item.funding_account_id, item.maturity_instruction, item.status, item.closed_date,
    coalesce(item.principal_returned, false), item.notes, item.created_at, item.updated_at
  from jsonb_to_recordset(coalesce(changes #> '{fixed_deposits,upsert}', '[]'::jsonb)) as item(
    id text, institution text, account_number text, principal_paise bigint, start_date date,
    maturity_date date, annual_rate_basis_points integer, interest_type text,
    compounds_per_year integer, linked_account_id text, funding_account_id text, maturity_instruction text,
    status text, closed_date date, principal_returned boolean, notes text, created_at timestamptz, updated_at timestamptz
  )
  on conflict (user_id, id) do update set
    institution = excluded.institution, account_number = excluded.account_number,
    principal_paise = excluded.principal_paise, start_date = excluded.start_date,
    maturity_date = excluded.maturity_date, annual_rate_basis_points = excluded.annual_rate_basis_points,
    interest_type = excluded.interest_type, compounds_per_year = excluded.compounds_per_year,
    linked_account_id = excluded.linked_account_id, funding_account_id = excluded.funding_account_id,
    maturity_instruction = excluded.maturity_instruction,
    status = excluded.status, closed_date = excluded.closed_date, principal_returned = excluded.principal_returned, notes = excluded.notes, created_at = excluded.created_at,
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

revoke all on function public.finance_apply_changes(integer, jsonb) from public;
grant execute on function public.finance_apply_changes(integer, jsonb) to authenticated;
