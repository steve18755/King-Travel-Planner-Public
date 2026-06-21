-- King Family Travel Planner v7.0 Row Level Security policies

alter table app.households enable row level security;
alter table app.profiles enable row level security;
alter table app.profile_private enable row level security;
alter table app.app_users enable row level security;
alter table app.household_members enable row level security;
alter table app.planner_state enable row level security;
alter table app.destinations enable row level security;
alter table app.trips enable row level security;
alter table app.trip_travelers enable row level security;
alter table app.itinerary_items enable row level security;
alter table app.budget_lines enable row level security;
alter table app.loyalty_programs enable row level security;
alter table app.profile_loyalty_accounts enable row level security;
alter table app.deals enable row level security;
alter table app.bucket_items enable row level security;
alter table app.pets enable row level security;
alter table app.pet_sitters enable row level security;
alter table app.audit_log enable row level security;

-- Drop existing v7 policies if re-running.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='app' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- app_users: approved users can read their own row. Admins can read/manage all.
create policy app_users_read_self_or_admin on app.app_users for select
  using (auth_user_id = auth.uid() or app.is_admin());
create policy app_users_admin_all on app.app_users for all
  using (app.is_admin()) with check (app.is_admin());

-- Households and household_members
create policy households_read_approved on app.households for select
  using (app.is_admin() or app.can_access_household(id));
create policy households_admin_all on app.households for all
  using (app.is_admin()) with check (app.is_admin());

create policy household_members_read_related on app.household_members for select
  using (app.is_admin() or app.can_access_household(household_id));
create policy household_members_admin_all on app.household_members for all
  using (app.is_admin()) with check (app.is_admin());

-- Profiles: family-level public profile read; sensitive fields separate.
create policy profiles_read_approved_family on app.profiles for select
  using (app.is_admin() or exists(select 1 from app.app_users u where u.auth_user_id=auth.uid() and u.approved=true));
create policy profiles_update_self_lead_admin on app.profiles for update
  using (app.is_admin() or id = app.current_profile_id() or app.can_manage_household(household_id))
  with check (app.is_admin() or id = app.current_profile_id() or app.can_manage_household(household_id));
create policy profiles_insert_admin on app.profiles for insert with check (app.is_admin());
create policy profiles_delete_admin on app.profiles for delete using (app.is_admin());

-- Sensitive profile fields: self, admin, or household lead.
create policy private_profile_read_limited on app.profile_private for select
  using (app.is_admin() or profile_id = app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)));
create policy private_profile_write_limited on app.profile_private for all
  using (app.is_admin() or profile_id = app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)))
  with check (app.is_admin() or profile_id = app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)));

-- planner_state: household or user scoped; global is admin-only.
create policy planner_state_read on app.planner_state for select
  using (app.is_admin() or (scope='household' and app.can_access_household(household_id)) or (scope='user' and owner_profile_id=app.current_profile_id()));
create policy planner_state_insert on app.planner_state for insert
  with check (app.is_admin() or (scope='household' and app.can_manage_household(household_id)) or (scope='user' and owner_profile_id=app.current_profile_id()));
create policy planner_state_update on app.planner_state for update
  using (app.is_admin() or (scope='household' and app.can_manage_household(household_id)) or (scope='user' and owner_profile_id=app.current_profile_id()))
  with check (app.is_admin() or (scope='household' and app.can_manage_household(household_id)) or (scope='user' and owner_profile_id=app.current_profile_id()));
create policy planner_state_delete_admin on app.planner_state for delete using (app.is_admin());

-- Public reference data
create policy destinations_read_approved on app.destinations for select
  using (exists(select 1 from app.app_users u where u.auth_user_id=auth.uid() and u.approved=true));
create policy destinations_admin_or_creator_write on app.destinations for all
  using (app.is_admin() or created_by=auth.uid()) with check (app.is_admin() or created_by=auth.uid());

create policy loyalty_programs_read_approved on app.loyalty_programs for select
  using (exists(select 1 from app.app_users u where u.auth_user_id=auth.uid() and u.approved=true));
create policy loyalty_programs_admin_all on app.loyalty_programs for all
  using (app.is_admin()) with check (app.is_admin());

-- Trips: traveler, same household, public/family, or admin.
create policy trips_read_allowed on app.trips for select
  using (app.is_admin() or visibility in ('family','public') or app.can_access_household(household_id) or exists(select 1 from app.trip_travelers tt where tt.trip_id=id and tt.profile_id=app.current_profile_id()));
create policy trips_write_lead_or_owner on app.trips for all
  using (app.is_admin() or app.can_manage_household(household_id) or owner_profile_id=app.current_profile_id())
  with check (app.is_admin() or app.can_manage_household(household_id) or owner_profile_id=app.current_profile_id());

create policy trip_travelers_read_allowed on app.trip_travelers for select
  using (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and (t.visibility in ('family','public') or app.can_access_household(t.household_id))) or profile_id=app.current_profile_id());
create policy trip_travelers_write_trip_manager on app.trip_travelers for all
  using (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and app.can_manage_household(t.household_id)))
  with check (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and app.can_manage_household(t.household_id)));

create policy itinerary_read_trip_allowed on app.itinerary_items for select
  using (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and (t.visibility in ('family','public') or app.can_access_household(t.household_id) or exists(select 1 from app.trip_travelers tt where tt.trip_id=t.id and tt.profile_id=app.current_profile_id()))));
create policy itinerary_write_trip_manager on app.itinerary_items for all
  using (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and app.can_manage_household(t.household_id)))
  with check (app.is_admin() or exists(select 1 from app.trips t where t.id=trip_id and app.can_manage_household(t.household_id)));

-- Budgets: household only unless marked family/public; write by household lead/admin.
create policy budget_read_allowed on app.budget_lines for select
  using (app.is_admin() or visibility in ('family','public') or app.can_access_household(household_id));
create policy budget_write_lead on app.budget_lines for all
  using (app.is_admin() or app.can_manage_household(household_id))
  with check (app.is_admin() or app.can_manage_household(household_id));

-- Accounts: read self/household lead/admin; program can be visible but private account number should stay restricted by this row policy.
create policy loyalty_accounts_read_limited on app.profile_loyalty_accounts for select
  using (app.is_admin() or profile_id=app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)));
create policy loyalty_accounts_write_limited on app.profile_loyalty_accounts for all
  using (app.is_admin() or profile_id=app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)))
  with check (app.is_admin() or profile_id=app.current_profile_id() or exists(select 1 from app.profiles p where p.id=profile_id and app.can_manage_household(p.household_id)));

-- Deals and bucket items
create policy deals_read_allowed on app.deals for select
  using (app.is_admin() or household_id is null or app.can_access_household(household_id));
create policy deals_write_allowed on app.deals for all
  using (app.is_admin() or household_id is null or app.can_manage_household(household_id) or created_by=auth.uid())
  with check (app.is_admin() or household_id is null or app.can_manage_household(household_id) or created_by=auth.uid());

create policy bucket_read_family_matches on app.bucket_items for select
  using (app.is_admin() or owner_profile_id=app.current_profile_id() or app.can_access_household(household_id));
create policy bucket_write_self_or_lead on app.bucket_items for all
  using (app.is_admin() or owner_profile_id=app.current_profile_id() or app.can_manage_household(household_id))
  with check (app.is_admin() or owner_profile_id=app.current_profile_id() or app.can_manage_household(household_id));

-- Pet care
create policy pets_read_household on app.pets for select
  using (app.is_admin() or app.can_access_household(household_id));
create policy pets_write_household_lead on app.pets for all
  using (app.is_admin() or app.can_manage_household(household_id))
  with check (app.is_admin() or app.can_manage_household(household_id));

create policy pet_sitters_read_household on app.pet_sitters for select
  using (app.is_admin() or app.can_access_household(household_id));
create policy pet_sitters_write_household_lead on app.pet_sitters for all
  using (app.is_admin() or app.can_manage_household(household_id))
  with check (app.is_admin() or app.can_manage_household(household_id));

-- Audit log: users can insert own event; admins read all.
create policy audit_insert_authenticated on app.audit_log for insert
  with check (auth.uid() is not null and (actor_user_id=auth.uid() or actor_user_id is null));
create policy audit_read_admin on app.audit_log for select using (app.is_admin());
