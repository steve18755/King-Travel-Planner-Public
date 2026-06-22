# Pass 2C — Save/Load Data Integrity Test Plan

**Branch:** `working-v6.8-pass1-repair2`  
**Pass:** `v7.3.1 / Pass 2C`  
**Scope:** Supabase planner-state integrity, backup readiness, and cross-session Save/Load validation.

---

## Goal

Pass 2C verifies that the planner can safely save and reload the full app state through Supabase without losing or corrupting data.

This pass does **not** change the user-facing planner forms. It adds backend integrity metadata and a backup table for the current `app.planner_state` workflow.

---

## Migration

Run this SQL migration in Supabase SQL Editor:

```text
supabase/migrations/20260622_pass2c_planner_state_integrity.sql
```

The migration adds:

- `state_hash` to `app.planner_state`
- `state_bytes` to `app.planner_state`
- `integrity_updated_at` to `app.planner_state`
- `app.planner_state_backups`
- `app.planner_state_health`
- trigger to update hash/size metadata on save
- trigger to backup previous state before updates/deletes

---

## Verification SQL

After running the migration, run:

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

- A row for the current household planner state after at least one app Save.
- `state_bytes` should be greater than zero.
- `state_hash_prefix` should be populated.
- `backup_count` may be zero until the next changed Save creates a backup.

---

## App Test Sequence

### Test 1 — Baseline app session

1. Deploy or wait for GitHub Pages to finish deploying the active branch.
2. Hard refresh the app: `Ctrl + F5`.
3. Login as Stephen / `steve`.
4. Confirm Dashboard loads.
5. Confirm bottom-right bar shows only:

```text
Save | Load | Sign out
```

6. Confirm Data/Admin still shows Asset Diagnostics.
7. Run Asset Diagnostics and confirm images/storage remain clean.

---

### Test 2 — Save current planner state

1. Click bottom-right **Save**.
2. Confirm the app reports saved to Supabase.
3. Run the verification SQL above.
4. Confirm `app.planner_state_health` shows current metadata.

Expected:

```text
state_bytes > 0
state_hash_prefix populated
updated_at current/recent
integrity_updated_at current/recent
```

---

### Test 3 — Changed Save creates backup

1. Make a small harmless planner change, such as editing a note field or adding a test research note.
2. Click **Save** again.
3. Run:

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
- `backup_action` should normally be `UPDATE`.
- `saved_at` should be current/recent.

---

### Test 4 — Reload from Supabase

1. Click bottom-right **Load**.
2. Confirm the app reloads and the planner still renders.
3. Confirm the small harmless planner change is still present.
4. Confirm Dashboard still works.
5. Confirm top-bar Logout / Switch User still work.

---

### Test 5 — Cross-session check

1. Open the app in a new browser window or another browser profile.
2. Login as Stephen / `steve`.
3. Click **Load**.
4. Confirm the same data appears.
5. Logout.

---

## Success Criteria

Pass 2C is successful when:

- Save works.
- Load works.
- Dashboard still works.
- Login/logout remains stable.
- `app.planner_state_health` returns a valid row.
- `state_bytes` and `state_hash_prefix` populate.
- A changed Save creates at least one backup row in `app.planner_state_backups`.
- Asset Diagnostics remains available only in Data/Admin.

---

## Rollback Notes

If the migration causes issues, do **not** delete planner state data. Instead, disable triggers first:

```sql
alter table app.planner_state disable trigger trg_planner_state_integrity;
alter table app.planner_state disable trigger trg_backup_planner_state_before_change;
```

Then re-test Save/Load. The backup table can remain in place safely.
