# GitHub Cleanup Checklist

Recommended cleanup before continuing public GitHub Pages use:

1. Delete old public files/folders that contained real family data.
2. Replace the repo contents with the v6.8 public-safe package.
3. Check GitHub commit history. Deleting files from the latest commit does not remove them from old commits.
4. If sensitive data was ever committed publicly, consider creating a fresh repository or rewriting history with git-filter-repo/BFG.
5. Rotate or replace any exposed sensitive values: KTN/Global Entry, loyalty passwords, account passwords, etc. Account numbers alone may not always be credentials, but treat exposed travel IDs as compromised.
6. Keep future private JSON exports out of the repo. Add them to .gitignore.
7. Use GitHub Pages for the app shell only until a protected backend is added.
