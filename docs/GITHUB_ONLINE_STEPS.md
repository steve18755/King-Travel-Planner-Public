# GitHub Pages Online Steps

## Recommended clean deployment

1. Create a new clean repository, for example `king-travel-planner-public`.
2. Upload only the v7.0 Supabase package files.
3. Do not upload old JSON exports, passport images, KTN screenshots, family photos, or real account card scans.
4. In GitHub repository settings, enable Pages from the main branch/root or from GitHub Actions.
5. Open the published URL.
6. Confirm the Supabase login screen appears.

## If using the old repository

The old repository may contain sensitive data in commit history. Safer options:

1. Make the old repository private.
2. Disable GitHub Pages on the old repository.
3. Create a new clean public repository.
4. Upload v7.0 only.

If you must keep the same repo URL, rewrite Git history with `git filter-repo` or create an orphan branch and force-push. This is more error-prone than starting clean.

## Files that should never be committed

- private JSON exports
- real family contact lists
- passport/KTN/Global Entry images
- trip documents with ticket numbers or PNRs
- full loyalty account numbers
- service-role keys
- `.env` files with secrets
