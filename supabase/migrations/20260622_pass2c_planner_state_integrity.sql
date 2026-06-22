-- King Family Travel Planner - Pass 2C planner_state integrity and backup readiness
-- Purpose:
--   1. Add checksum/size metadata to app.planner_state.
--   2. Keep an automatic backup row before planner_state updates/deletes.
--   3. Add an app.planner_state_health view for Data/Admin verification.
--
-- Run in Supabase SQL Editor after Pass 2B is confirmed stable.

create extension if not exists pgcrypto;

-- 1) Current planner_state metadata
alter table if exists app.planner_state
  add column if not exists state_hash text,
  add column if not exists state_bytes integer,
  add column if not exists integrity_updated_at timestamptz;

create index if not exists planner_state_household_idx
  on app.planner_state(household_id);

create index if not exists planner_state_updated_at_idx
  on app.planner_state(updated_at desc);

create index if not exists planner_state_state_hash_idx
  on app.planner_state(state_hash);

-- 2) Backup table. This intentionally stores the pre-change state.
create table if not exists app.planner_state_backups (
  backup_id uuid primary key default gen_random_uuid(),
  scope text,
  household_id text,
  owner_profile_id text,
  state jsonb not null,
  version text,
  state_hash text,
  state_bytes integer,
  previous_updated_at timestamptz,
  previous_updated_by uuid,
  backup_action text not null default 'UPDATE',
  saved_at timestamptz not null default now(),
  saved_by uuid default auth.uid(),
  constraint planner_state_backups_action_check check (backup_action in ('UPDATE','DELETE','MANUAL'))
);

create index if not exists planner_state_backups_household_idx
  on app.planner_state_backups(household_id, saved_at desc);

create index if not exists planner_state_backups_hash_idx
  on app.planner_state_backups(state_hash);

alter table app.planner_state_backups enable row level security;

drop policy if exists planner_state_backups_select_household on app.planner_state_backups;
drop policy if exists planner_state_backups_delete_admin on app.planner_state_backups;

create policy planner_state_backups_select_household
on app.planner_state_backups
for select
to authenticated
using (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = planner_state_backups.household_id
  )
);

create policy planner_state_backups_delete_admin
on app.planner_state_backups
for delete
to authenticated
using (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = planner_state_backups.household_id
      and au.role in ('admin','household_lead')
  )
);

grant select, delete on app.planner_state_backups to authenticated;
grant all on app.planner_state_backups to service_role;

-- 3) Integrity metadata trigger for current planner_state.
create or replace function app.touch_planner_state_integrity()
returns trigger
language plpgsql
as $$
begin
  new.integrity_updated_at = now();
  new.state_bytes = length(convert_to(coalesce(new.state::text, ''), 'UTF8'));
  new.state_hash = encode(digest(coalesce(new.state::text, ''), 'sha256'), 'hex');

  if new.updated_at is null then
    new.updated_at = now();
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('app.planner_state') is not null then
    drop trigger if exists trg_planner_state_integrity on app.planner_state;
    create trigger trg_planner_state_integrity
    before insert or update on app.planner_state
    for each row execute function app.touch_planner_state_integrity();
  end if;
end;
$$;

-- 4) Backup trigger. SECURITY DEFINER allows the trigger to write the backup row
-- even when normal users do not have direct insert privileges on the backup table.
create or replace function app.backup_planner_state_before_change()
returns trigger
language plpgsql
security definer
set search_path = app, public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.state::text is not distinct from new.state::text then
    return new;
  end if;

  insert into app.planner_state_backups (
    scope,
    household_id,
    owner_profile_id,
    state,
    version,
    state_hash,
    state_bytes,
    previous_updated_at,
    previous_updated_by,
    backup_action,
    saved_by
  )
  values (
    old.scope,
    old.household_id,
    old.owner_profile_id,
    old.state::jsonb,
    old.version,
    encode(digest(coalesce(old.state::text, ''), 'sha256'), 'hex'),
    length(convert_to(coalesce(old.state::text, ''), 'UTF8')),
    old.updated_at,
    old.updated_by,
    tg_op,
    auth.uid()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('app.planner_state') is not null then
    drop trigger if exists trg_backup_planner_state_before_change on app.planner_state;
    create trigger trg_backup_planner_state_before_change
    before update or delete on app.planner_state
    for each row execute function app.backup_planner_state_before_change();
  end if;
end;
$$;

-- 5) Health view for admin/Data checks. security_invoker keeps underlying RLS active.
create or replace view app.planner_state_health
with (security_invoker = true)
as
select
  ps.scope,
  ps.household_id,
  ps.owner_profile_id,
  ps.version,
  ps.updated_at,
  ps.updated_by,
  ps.integrity_updated_at,
  ps.state_bytes,
  left(ps.state_hash, 16) as state_hash_prefix,
  (
    select count(*)::integer
    from app.planner_state_backups b
    where coalesce(b.scope, '') = coalesce(ps.scope, '')
      and coalesce(b.household_id, '') = coalesce(ps.household_id, '')
      and coalesce(b.owner_profile_id, '') = coalesce(ps.owner_profile_id, '')
  ) as backup_count
from app.planner_state ps;

grant select on app.planner_state_health to authenticated;
grant select on app.planner_state_health to service_role;

-- 6) Force PostgREST/Supabase schema cache refresh.
notify pgrst, 'reload schema';

-- Optional verification query after running migration:
-- select * from app.planner_state_health;
