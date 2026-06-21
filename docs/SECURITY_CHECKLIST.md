# Security Checklist

- [ ] Service-role key is not in GitHub.
- [ ] `js/supabase-config.js` contains only URL and anon/publishable key.
- [ ] RLS is enabled on every `app.*` table.
- [ ] Storage buckets are private.
- [ ] Identity document bucket is self/admin only.
- [ ] Each auth user is approved and linked in `app.app_users`.
- [ ] Child users have role `child`.
- [ ] Admin-only pages are hidden and blocked in the UI.
- [ ] Old GitHub repo is private or cleaned.
- [ ] GitHub Pages repo contains no real private data.
- [ ] Browser localStorage is treated as a temporary cache, not the authority.
