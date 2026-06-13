# v6.8 Asset Structure / De-duplication Notes

This build updates the planner to match the cleaned asset folder structure requested by the user.

## Active folders

```text
assets/images/airlines/
assets/images/casinos/
assets/images/deals/
assets/images/destinations/
assets/images/generated/
assets/images/hotels/
assets/images/loyalty/
assets/images/people/
assets/images/pets/
assets/images/ui/
```

## Removed / not used

```text
assets/images/cards/
assets/images/fallback-icons/
*.svg airline placeholders
```

## Program de-duplication

The v6.8 runtime normalizes obvious duplicate loyalty programs such as:

- `Station Casinos Boarding Pass` -> `Station Casinos`
- `Passport Rewards / Peppermill Reno` -> `Passport Rewards / Peppermill`
- `IHG Rewards Club` -> `IHG`
- WinStar / Club Passport variations -> `Club Passport / WinStar`

Associated family account entries are remapped to the canonical program so account data is preserved.
