# Data Model Notes

v7.0 uses a two-layer model:

1. `app.planner_state` stores the current full planner state as JSONB. This gets the existing planner online quickly without losing the working v6.x functionality.
2. Normalized tables are created for the future secure module-by-module migration: trips, itinerary items, budgets, loyalty accounts, pets, deals, destinations, bucket items, and audit logs.

Future versions should progressively replace `planner_state` with direct reads/writes to normalized tables.

## Why keep planner_state for v7.0?

The existing planner is a large single-file static app. Rewriting every function to use normalized Supabase tables in one pass would risk breaking the working planner. The JSONB bridge lets the family use the app online now while the secure schema is in place.

## Recommended v7.1 migration order

1. Profiles and households
2. Trips
3. Itinerary
4. Budget lines
5. Loyalty/airline accounts
6. Deals
7. Bucket list
8. Pet care
9. Storage uploads
10. Audit reports
