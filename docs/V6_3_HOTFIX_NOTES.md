# v6.3 Hotfix Notes

Issue reported: v6.2 loaded as a mostly blank page with only navigation icons visible and no page content.

Likely cause: GitHub Pages or repository upload/caching did not serve one or more external runtime files (`css/styles.css`, `js/app.js`, supporting JS). The app relied on external JS/CSS paths, so missing or stale files caused render failure.

Fix: `index.html` now inlines the CSS and JavaScript runtime while preserving the source `css/` and `js/` folders for future development. Images remain external local assets in `assets/images/...`.

Also updated the visible version label to v6.3.
