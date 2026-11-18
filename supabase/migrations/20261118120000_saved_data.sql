-- Phase 6: saved household answers and daily plans.
-- Design: docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md

create table public.household_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_label text not null
    check (char_length(location_label) between 1 and 120),
  plan_json jsonb not null
    check (jsonb_typeof(plan_json) = 'object' and octet_length(plan_json::text) <= 65536),
  created_at timestamptz not null default now()
);

create index daily_plans_user_created_idx
  on public.daily_plans (user_id, created_at desc);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger household_preferences_updated_at
  before update on public.household_preferences
  for each row execute function public.set_updated_at();

-- At most 20 plans per user, also for writes made outside the app. The
-- per-user lock stops two saves at once from both passing the count.
create function public.enforce_plan_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.daily_plans where user_id = new.user_id) >= 20 then
    raise exception 'plan_limit_reached';
  end if;
  return new;
end;
$$;

create trigger daily_plans_limit
  before insert on public.daily_plans
  for each row execute function public.enforce_plan_limit();

alter table public.household_preferences enable row level security;
alter table public.daily_plans enable row level security;

create policy "own preferences: select" on public.household_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own preferences: insert" on public.household_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own preferences: update" on public.household_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own preferences: delete" on public.household_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);

-- A saved plan never changes, so there is no update policy.
create policy "own plans: select" on public.daily_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own plans: insert" on public.daily_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own plans: delete" on public.daily_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Deletes only the calling user; their rows go with them (on delete cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
