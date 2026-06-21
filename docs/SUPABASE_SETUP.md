# King Family Travel Planner v7.0 — Supabase Online Setup

This package converts the public-safe planner into a Supabase-backed planner. GitHub Pages hosts the static app. Supabase provides login, database, RLS, storage, and audit logging.

## Do not commit secrets

Safe to place in `js/supabase-config.js`:

- Supabase Project URL
- Supabase anon/public/publishable key

Never place the service-role key in GitHub or in browser JavaScript.

## 1. Run SQL migrations

In Supabase Dashboard > SQL Editor, run the files in this order:

1. `supabase/01_schema.sql`
2. `supabase/02_rls_policies.sql`
3. `supabase/03_storage.sql`
4. `supabase/04_seed_reference_data.sql`

## 2. Configure Auth

In Supabase Dashboard > Authentication > Providers:

- Enable Email provider.
- Choose whether email confirmations are required.
- Add your GitHub Pages URL under Authentication > URL Configuration > Site URL.
- Add redirect URLs for your GitHub Pages site.

Example redirect URL:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO/
```

## 3. Add project URL and anon key

Open:

```text
js/supabase-config.js
```

Set:

```javascript
window.KFTP_SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR_ANON_OR_PUBLISHABLE_KEY",
  mode: "supabase",
  plannerStateScope: "household",
  autosaveSeconds: 60
};
```

## 4. Upload the site to GitHub

Upload all files from this folder to your GitHub Pages repo root:

```text
index.html
js/
supabase/
docs/
assets/
README.md
.gitignore
```

The `supabase/` SQL folder can remain in the repo because it contains no private family data. Do not add real emails to `05_admin_link_users_template.sql` and commit it.

## 5. Create the first user

Open the published site and use **Create account** for Stephen.

Then return to Supabase SQL Editor and run a version of this query, replacing the email with Stephen's actual Supabase login email:

```sql
insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
select id, 'stephen_king', 'stephen_household', 'admin', true
from auth.users
where email = 'stephen@example.com'
on conflict (auth_user_id) do update
set profile_id=excluded.profile_id,
    household_id=excluded.household_id,
    role=excluded.role,
    approved=true;
```

Sign out/sign back in. Stephen should now load as admin.

## 6. Add family members

Each family member creates a login on the site. After each login is created, Stephen or David links/approves the user in SQL:

```sql
insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
select id, 'selma_ward', 'stephen_household', 'household_lead', true
from auth.users
where email = 'selma@example.com'
on conflict (auth_user_id) do update
set profile_id=excluded.profile_id,
    household_id=excluded.household_id,
    role=excluded.role,
    approved=true;
```

Use these roles:

- `admin`
- `household_lead`
- `adult`
- `child`
- `viewer`

## 7. First cloud save

After Stephen logs in:

1. Confirm the app displays correctly.
2. Click **Save** in the Supabase cloud bar in the lower-right corner.
3. This writes the current planner state to `app.planner_state`.
4. Other approved household users can load it through Supabase.

## 8. Move private data into Supabase only

Do not put private data in GitHub. Enter private information only after logging in, and use Supabase storage/tables.

Sensitive data includes:

- real emails
- phone numbers
- street addresses
- full birth dates
- KTN / Global Entry
- passport numbers/images
- full loyalty account numbers
- trip documents
- private family photos

## 9. Storage buckets

The migration creates private buckets:

- `profile-photos`
- `pet-photos`
- `trip-photos`
- `trip-documents`
- `secure-identity-documents`

Identity documents should be uploaded only under a folder named with the user UUID, for example:

```text
secure-identity-documents/<auth-user-uuid>/passport.pdf
```

## 10. Validation checklist

Before giving access to family:

- RLS enabled on all `app.*` tables.
- Auth works for Stephen.
- Stephen is approved as admin.
- David is approved as admin.
- Non-admin account cannot open Data/Admin tools.
- Household budget data is not visible to other households.
- Private identity bucket blocks other users.
- GitHub repo has no real family JSON or private images.
