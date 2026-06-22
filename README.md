# King Family Travel Planner

**Current working branch:** `working-v6.8-pass1-repair2`  
**Current checkpoint:** `v7.3.0 / Pass 2B`  
**Last verified:** 2026-06-22  
**Primary deployment target:** GitHub Pages from the active working branch.

This repository contains the King Family Travel Planner web app. The current build uses a GitHub Pages front end with Supabase Auth, Supabase database tables, and Supabase Storage readiness for future private assets.

---

## Current Stable Status

As of Pass 2B, the following items are confirmed working:

- Supabase family login using the family selector and username/password flow.
- Stephen King login with username `steve` mapped to the approved Supabase email.
- Login, logout, top-bar Logout, top-bar Switch User, and bottom-right Sign out.
- Dashboard rendering after login.
- Supabase Save and Load controls.
- Supabase Storage buckets created and reachable.
- `app.asset_files` metadata table created and reachable.
- Public placeholder image assets load cleanly.
- Asset Diagnostics moved from the temporary bottom-right bar into Data/Admin.

The bottom-right Supabase bar should now show only:

```text
Save | Load | Sign out
```

Asset Diagnostics should appear only under Data/Admin for approved admin users Stephen King and David King.

---

## Current Branch / Version Notes

The app was stabilized through a series of passes. The most important current branch is:

```text
working-v6.8-pass1-repair2
```

Do not use the older broken Pass 2 backup branch for active development.

Known historical branches/checkpoints:

| Branch / checkpoint | Purpose | Status |
|---|---|---|
| `working-v6.8-local-gate-supabase-bridge` | Earlier Supabase bridge work | Superseded |
| `backup-pass2-broken-20260622` | Backup of broken dashboard/asset attempt | Backup only |
| `working-v6.8-pass1-restored` | Restored Pass 1 state | Superseded by repair2 |
| `working-v6.8-pass1-repair2` | Current stable branch | Active |

---

## Pass History

### Pass 1 — Supabase Family Login Bridge

Goal: replace the local prototype login gate with Supabase Auth while preserving the family-member login experience.

Completed:

- Supabase Auth login enabled.
- Family selector retained.
- Username `steve` mapped to Stephen King’s approved Supabase email.
- `app.app_users` approval/role model used after Supabase Auth login.
- Existing app UI remained accessible after login.

Important note: the live `index.html` contains a significant amount of inline app code. Some older inline auth and UI behavior remains in that file, so the active bridge must account for it.

---

### Pass 1 Repair — Dashboard and Logout Stabilization

Goal: fix dashboard rendering and logout behavior after Supabase login.

Completed:

- Fixed dashboard failure caused by the legacy `masked-account` expression in the bundled dashboard code.
- Added compatibility globals used by the inline dashboard renderer:

```js
window.masked = 86400000;
window.account = 0;
```

- Fixed top-bar Logout and Switch User so they use Supabase sign-out instead of the old local login handler.
- Confirmed all logout flows work:
  - Top-bar Logout
  - Top-bar Switch User
  - Bottom-right Sign out

---

### Pass 2A — Asset Diagnostics and Supabase Storage Readiness

Goal: validate public image paths and prepare Supabase for future private asset storage.

Completed:

- Added temporary Asset Diagnostics button to the bottom-right Supabase bar.
- Confirmed GitHub public assets load.
- Added Supabase migration:

```text
supabase/migrations/20260622_pass2a_asset_storage.sql
```

That migration creates:

- `app.asset_files`
- `kftp-public-assets`
- `kftp-profile-photos`
- `kftp-loyalty-cards`
- `kftp-travel-documents`
- `kftp-trip-attachments`
- `kftp-pet-care`

Storage check result after migration:

```text
Images: 69 OK, 0 missing, 0 blocked
Storage: 6 reachable, 0 missing
app.asset_files: reachable
```

The buckets are intentionally empty for now. Real/private assets have not been uploaded yet.

---

### Pass 2B — Move Asset Diagnostics to Data/Admin

Goal: keep Asset Diagnostics as an admin function instead of leaving it in the temporary bottom-right bar.

Completed:

- Removed the temporary bottom-right Assets button.
- Added an Asset Diagnostics card/button under Data/Admin.
- Restricted Asset Diagnostics to approved admin users:

```js
appUser.approved === true &&
appUser.role === 'admin' &&
['stephen_king', 'david_king'].includes(appUser.profile_id)
```

- Kept audit logging when diagnostics are run.
- Kept the diagnostic function intact for future admin troubleshooting.

---

## Important Active Files

| File | Purpose |
|---|---|
| `index.html` | Main application shell. Contains substantial inline app code. Handle carefully. |
| `js/kftp-supabase-bridge.js` | Active Supabase bridge loaded by current `index.html`. This is the main integration file for login, save/load, logout fixes, and admin diagnostics. |
| `js/supabase-config.js` | Supabase public browser config. Must never contain the service-role key. |
| `js/security-local.js` | Older/local security shim. Some behavior may still be present, but the active Supabase bridge is the primary controller. |
| `supabase/migrations/20260622_pass2a_asset_storage.sql` | Asset metadata/storage setup migration. |

Do not rename the active files unless `index.html` is updated at the same time.

---

## Supabase Setup Notes

The current Supabase setup expects these application tables/schemas:

- `app.households`
- `app.profiles`
- `app.app_users`
- `app.planner_state`
- `app.audit_log`
- `app.asset_files`

The authenticated user must exist in Supabase Auth and must also be linked in `app.app_users`.

For Stephen King, the confirmed working user link is:

```text
auth_user_id: b4b565b7-e4ff-4759-a813-a4a9983d1651
email: steve18755@gmail.com
profile_id: stephen_king
household_id: stephen_household
role: admin
approved: true
```

---

## Asset Strategy

Current placeholders remain in GitHub public assets.

Confirmed placeholder paths:

```text
assets/images/people/Stephen.png
assets/images/pets/pepper_small.jpg
assets/images/pets/june_small.jpg
assets/images/ui/dashboard_beach_hero.png
assets/images/KingCrest.PNG
```

Future real/private assets should generally move into Supabase Storage instead of being committed to GitHub, especially:

- Profile photos with real people.
- Loyalty card images/PDFs.
- Airline award cards.
- Travel documents.
- Trip PDFs/confirmations.
- Dog-care documents or rate sheets.

Recommended private path convention:

```text
stephen_household/profile-photos/stephen_king/photo.jpg
stephen_household/loyalty-cards/stephen_king/card-name.pdf
stephen_household/trips/tahoe_2026/confirmation.pdf
stephen_household/pet-care/pepper/rate-sheet.pdf
```

Each uploaded private file should eventually have a matching `app.asset_files` record.

---

## Deployment Notes

For GitHub Pages, deploy from:

```text
Branch: working-v6.8-pass1-repair2
Folder: /(root)
```

After every GitHub Pages deployment, hard refresh the browser:

```text
Ctrl + F5
```

If testing login/logout or Supabase session behavior, use a fresh tab or close/reopen the browser if browser storage appears stale.

---

## Local Clone Notes

If recloning locally, use the active working branch:

```bash
git clone https://github.com/steve18755/King-Travel-Planner-Public.git
cd King-Travel-Planner-Public
git checkout working-v6.8-pass1-repair2
```

Before editing locally:

```bash
git pull origin working-v6.8-pass1-repair2
```

Recommended workflow:

```bash
git status
git add .
git commit -m "Short description"
git push origin working-v6.8-pass1-repair2
```

---

## Admin / Data Notes

Data/Admin currently hosts or should host admin-only utilities. Asset Diagnostics is now one of those utilities.

Access requirement:

```text
Stephen King or David King
approved app user
role = admin
```

Future admin functions should follow the same pattern.

---

## Current Next Pass Candidates

Recommended next pass options:

1. **Pass 2C — Supabase Save/Load Data Integrity**  
   Validate that planner state saves and reloads cleanly across browser sessions and devices.

2. **Pass 2D — Asset Upload UI**  
   Add controlled upload flows for profile photos, loyalty cards, travel documents, and pet-care files.

3. **Pass 2E — Real Profile/Pet Photo Wiring**  
   Replace placeholders with Supabase Storage-backed signed/public URLs where appropriate.

4. **Pass 3 — Code Cleanup / Inline App Extraction Plan**  
   Begin reducing risk from the large inline `index.html` by moving stable modules into external JS files.

---

## Known Cautions

- `index.html` is fragile because it contains a large amount of inline app logic.
- Some earlier attempts to directly replace `index.html` broke rendering.
- Prefer narrow external JS patches unless the pass explicitly targets HTML cleanup.
- Do not commit Supabase service-role keys to this repository.
- Keep real/private documents out of GitHub unless they are intentionally public placeholders.
