# King Family Travel Planner v7.0 — Supabase Secure Backend

This package is the Supabase-ready version of the public-safe King Family Travel Planner.

## Contents

- `index.html` — planner app
- `js/supabase-config.js` — enter your Supabase URL and anon/publishable key
- `js/kftp-supabase-bridge.js` — Supabase login and planner-state sync bridge
- `supabase/*.sql` — database schema, RLS, storage buckets, seed data, and user linking template
- `docs/` — setup, security, and deployment instructions

## Quick start

1. Run SQL files in Supabase in order: `01`, `02`, `03`, `04`.
2. Edit `js/supabase-config.js` with your Supabase URL and anon key.
3. Upload this folder to GitHub Pages.
4. Create a Supabase Auth account from the site.
5. Link/approve the auth user using `05_admin_link_users_template.sql`.
6. Sign in and click **Save** in the Supabase cloud bar.

Do not commit real family/private data to GitHub.
