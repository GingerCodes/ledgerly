-- Expenses may now be paid from any account, not only CASH.
-- The old rule was an unnamed check, so find it by its definition.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.finance_transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%CASH%'
  loop
    execute format('alter table public.finance_transactions drop constraint %I', c.conname);
  end loop;
end $$;
