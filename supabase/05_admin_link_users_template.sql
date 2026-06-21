-- King Family Travel Planner v7.0 user linking template
-- Run AFTER each person creates a Supabase Auth account.
-- Replace the emails below with each person's actual login email.
-- Do NOT commit this file after adding real emails.

-- Example: link Stephen as admin after Stephen signs up in the app.
-- insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
-- select id, 'stephen_king', 'stephen_household', 'admin', true
-- from auth.users where email = 'stephen@example.com'
-- on conflict (auth_user_id) do update set profile_id=excluded.profile_id, household_id=excluded.household_id, role=excluded.role, approved=true;

-- Example: link David as admin after David signs up.
-- insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
-- select id, 'david_king', 'david_household', 'admin', true
-- from auth.users where email = 'david@example.com'
-- on conflict (auth_user_id) do update set profile_id=excluded.profile_id, household_id=excluded.household_id, role=excluded.role, approved=true;

-- Example: household lead.
-- insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
-- select id, 'selma_ward', 'stephen_household', 'household_lead', true
-- from auth.users where email = 'selma@example.com'
-- on conflict (auth_user_id) do update set profile_id=excluded.profile_id, household_id=excluded.household_id, role=excluded.role, approved=true;

-- Example: child account.
-- insert into app.app_users (auth_user_id, profile_id, household_id, role, approved)
-- select id, 'daniel_king', 'joshua_household', 'child', true
-- from auth.users where email = 'daniel@example.com'
-- on conflict (auth_user_id) do update set profile_id=excluded.profile_id, household_id=excluded.household_id, role=excluded.role, approved=true;
