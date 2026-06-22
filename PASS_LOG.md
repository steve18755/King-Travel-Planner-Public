# King Family Travel Planner — Pass Log

Current branch: `working-v6.8-pass1-repair2`

Current checkpoint: `v7.3.1 / Pass 2C`

## Stable through Pass 2B

- Supabase family login works.
- Top-bar Logout works.
- Top-bar Switch User works.
- Bottom-right Sign out works.
- Dashboard renders after login.
- Save and Load controls are present.
- Asset Diagnostics is available under Data/Admin only.
- Asset Diagnostics is restricted to approved admin users Stephen King and David King.
- Public placeholder images load cleanly.
- Supabase Storage buckets are reachable.
- `app.asset_files` is reachable.

## Pass 2C added

Pass 2C focuses on Save/Load data integrity.

New files:

```text
supabase/migrations/20260622_pass2c_planner_state_integrity.sql
docs/pass2c_save_load_integrity_test_plan.md
```

The migration adds planner-state integrity metadata and automatic backup support:

- `state_hash`
- `state_bytes`
- `integrity_updated_at`
- `app.planner_state_backups`
- `app.planner_state_health`
- trigger to calculate current state hash/size
- trigger to back up the previous planner state before changed updates/deletes

## Pass 2C verification

After running the migration in Supabase SQL Editor, save the planner once from the app and run:

```sql
select
  scope,
  household_id,
  owner_profile_id,
  version,
  updated_at,
  integrity_updated_at,
  state_bytes,
  state_hash_prefix,
  backup_count
from app.planner_state_health
order by updated_at desc;
```

Expected:

- `state_bytes` is greater than zero.
- `state_hash_prefix` is populated.
- `updated_at` and `integrity_updated_at` are current/recent.
- `backup_count` may be zero until the next changed Save.

After making a small harmless planner change and saving again, verify backups:

```sql
select
  household_id,
  backup_action,
  saved_at,
  state_bytes,
  left(state_hash, 16) as state_hash_prefix
from app.planner_state_backups
order by saved_at desc
limit 10;
```

Expected:

- At least one backup row appears after a changed Save.
- `backup_action` normally shows `UPDATE`.

## Next pass candidates

1. Pass 2D — Asset Upload UI.
2. Pass 2E — Real Profile/Pet Photo Wiring.
3. Pass 2F — Family Profile Data Tables.
4. Pass 3 — Code cleanup / inline app extraction plan.
