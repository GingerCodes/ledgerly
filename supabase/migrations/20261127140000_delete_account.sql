-- Lets a signed-in user permanently delete their own account.
-- Deleting the auth user cascades to every finance_* table (all reference auth.users on delete cascade)
-- and frees the email address, so it can register again as a brand-new account.
-- Run after 20261127130000_fd_funding_account.sql.
create or replace function public.finance_delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  delete from auth.users where id = current_user_id;
end
$function$;

revoke all on function public.finance_delete_account() from public, anon;
grant execute on function public.finance_delete_account() to authenticated;
