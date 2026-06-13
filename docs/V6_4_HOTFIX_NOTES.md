# v6.4 Hotfix Notes

## Problem

v6.3 still rendered as a blank/mostly white page with only vertical navigation icons because old CSS rules `#nav.nav` and `#nav.nav button` had higher specificity than the v6 modern top-navigation `.nav` rules.

## Fix

Added final high-specificity overrides for:

- `#nav.nav`
- `#nav.nav button`
- `#nav.nav button span`
- `.side`
- `.layout`
- `.main`

This forces the navigation back to the intended horizontal modern top bar while preserving the existing v5/v6 page functions and real brand assets.
