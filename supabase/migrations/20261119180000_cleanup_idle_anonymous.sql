-- Nightly cleanup of anonymous accounts nobody has used for 30 days
-- (PRIVACY.md, DATABASE.md). Their saved answers and plans go with them
-- (on delete cascade). Never touches non-anonymous users.
-- Run once in the SQL Editor after enabling the pg_cron extension.

-- Idle = anonymous, and every activity date older than the cutoff: the
-- user row's own dates and the newest session and refresh-token dates
-- (a user whose sessions were pruned still counts their own dates).
create or replace function public.idle_anonymous_users(
  cutoff interval default interval '30 days'
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.is_anonymous
    and greatest(
      u.created_at,
      u.last_sign_in_at,
      u.updated_at,
      (select max(greatest(s.created_at, s.updated_at, s.refreshed_at))
         from auth.sessions s
        where s.user_id = u.id),
      (select max(greatest(t.created_at, t.updated_at))
         from auth.refresh_tokens t
        where t.user_id = u.id::text)
    ) < now() - cutoff
$$;

create or replace function public.delete_idle_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted integer;
begin
  delete from auth.users
  where id in (select public.idle_anonymous_users());
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- Only the pg_cron job (running as postgres) calls these; not the API.
revoke execute on function public.idle_anonymous_users(interval)
  from public, anon, authenticated;
revoke execute on function public.delete_idle_anonymous_users()
  from public, anon, authenticated;

-- Idempotent schedule: 21:30 UTC is 03:00 IST.
select cron.unschedule('delete-idle-anonymous-users')
where exists (
  select 1 from cron.job where jobname = 'delete-idle-anonymous-users'
);
select cron.schedule(
  'delete-idle-anonymous-users',
  '30 21 * * *',
  'select public.delete_idle_anonymous_users()'
);
