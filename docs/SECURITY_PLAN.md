# Security Plan — v3.1 and Next Phases

## Current v3.1 status

v3.1 provides a client-side local login gate using browser localStorage and SHA-256 password hashes. It supports first-login setup and role-aware UI hiding.

This is not full production security because all client-side code can be viewed by anyone who can access the hosted site, and localStorage is not appropriate for sensitive documents or secrets.

## Current roles

- `admin`: Stephen King only. Sees Data/Admin.
- `family`: primary family member access.
- `extended_family`: access to planner, profile, trip, calendar, and shared planning tools.

## Required production security

To make the planner fully secure, implement:

1. Supabase Auth or equivalent backend authentication.
2. Postgres tables with Row Level Security.
3. Protected file storage buckets for passports, confirmations, profile photos, and trip albums.
4. Role claims or profile-role table.
5. Server-side audit log.
6. Admin-only functions for user management, export/import, and deletion.
7. Password reset and account recovery.
8. Optional MFA for admin.

## Data classification

### Public/shared within family

- Destination library
- Trip ideas
- General itinerary notes
- Non-sensitive profile preferences
- General loyalty status summaries

### Private to traveler + admin

- Full contact details
- Passport status/expiration summaries
- KTN/Global Entry masked summaries
- Health-related/accessibility summaries
- Loyalty account summaries

### Highly sensitive; protected storage only

- Passport scans
- Full KTN/Global Entry numbers
- Full loyalty account numbers
- Payment data
- Health-related documents

