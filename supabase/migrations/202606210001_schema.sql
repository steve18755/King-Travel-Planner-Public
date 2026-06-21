-- King Family Travel Planner v7.0 Supabase schema
-- Run in Supabase SQL Editor as project owner.

create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------- Core identity / access ----------
create table if not exists app.households (
  id text primary key,
  name text not null,
  home_city text,
  home_state text,
  country text default 'USA',
  primary_airport text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.profiles (
  id text primary key,
  household_id text references app.households(id) on delete set null,
  display_name text not null,
  relationship_label text,
  role_label text,
  is_child boolean not null default false,
  home_city text,
  home_state text,
  country text default 'USA',
  primary_airport text,
  public_notes text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sensitive profile fields are separated from public profile data.
create table if not exists app.profile_private (
  profile_id text primary key references app.profiles(id) on delete cascade,
  email text,
  phone text,
  street_address text,
  city text,
  state_region text,
  postal_code text,
  country text,
  birth_date date,
  ktn text,
  global_entry text,
  passport_number text,
  passport_expiration date,
  secure_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists app.app_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id text not null references app.profiles(id) on delete cascade,
  household_id text not null references app.households(id) on delete cascade,
  role text not null check (role in ('admin','household_lead','adult','child','viewer')),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.household_members (
  household_id text references app.households(id) on delete cascade,
  profile_id text references app.profiles(id) on delete cascade,
  relationship text,
  can_manage_budget boolean not null default false,
  can_manage_trips boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

-- ---------- Flexible compatibility state ----------
-- v7.0 bridge stores the current full planner state here so the existing app can run online now.
-- Later versions can progressively replace this with normalized table reads/writes.
create table if not exists app.planner_state (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('household','user','global')) default 'household',
  household_id text references app.households(id) on delete cascade,
  owner_profile_id text references app.profiles(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  version text not null default 'v7.0',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (scope, household_id, owner_profile_id)
);

-- ---------- Normalized planner tables ----------
create table if not exists app.destinations (
  id text primary key,
  name text not null,
  category text,
  country text,
  region text,
  city text,
  state_region text,
  currency text,
  official_url text,
  image_path text,
  type_tags text[] default '{}',
  verification_status text,
  public_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  household_id text references app.households(id) on delete cascade,
  owner_profile_id text references app.profiles(id) on delete set null,
  destination_id text references app.destinations(id) on delete set null,
  start_date date,
  end_date date,
  status text default 'planned' check (status in ('idea','planned','booked','completed','cancelled')),
  visibility text default 'household' check (visibility in ('private','household','family','public')),
  budget_amount numeric(12,2),
  currency text default 'USD',
  notes text,
  trip_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.trip_travelers (
  trip_id uuid references app.trips(id) on delete cascade,
  profile_id text references app.profiles(id) on delete cascade,
  traveler_role text default 'traveler',
  created_at timestamptz not null default now(),
  primary key (trip_id, profile_id)
);

create table if not exists app.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references app.trips(id) on delete cascade,
  item_date date,
  item_time time,
  title text not null,
  location text,
  type text,
  cost numeric(12,2),
  currency text default 'USD',
  notes text,
  locked boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.budget_lines (
  id uuid primary key default gen_random_uuid(),
  household_id text references app.households(id) on delete cascade,
  trip_id uuid references app.trips(id) on delete set null,
  source_table text,
  source_id text,
  category text not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  currency text default 'USD',
  status text default 'estimate' check (status in ('estimate','actual','paid','cancelled')),
  visibility text default 'household' check (visibility in ('private','household','family','public')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.loyalty_programs (
  id text primary key,
  name text not null,
  category text not null check (category in ('airline','hotel','casino','dining','park','other')),
  alliance text,
  website_url text,
  icon_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists app.profile_loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id text references app.profiles(id) on delete cascade,
  program_id text references app.loyalty_programs(id) on delete cascade,
  status_tier text,
  account_number_masked text,
  points_balance_summary text,
  expiration_summary text,
  notes text,
  private_account_number text,
  private_card_image_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, program_id)
);

create table if not exists app.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_key text not null,
  household_id text references app.households(id) on delete set null,
  destination_id text references app.destinations(id) on delete set null,
  status text default 'needs_verification' check (status in ('needs_verification','active','verified','expired','archived')),
  source_type text,
  source_url text,
  image_path text,
  price_per_person numeric(12,2),
  total_price numeric(12,2),
  currency text default 'USD',
  travel_window text,
  verified boolean not null default false,
  notes text,
  deal_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(normalized_key)
);

create table if not exists app.bucket_items (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id text references app.profiles(id) on delete cascade,
  household_id text references app.households(id) on delete cascade,
  title text not null,
  normalized_key text not null,
  location text,
  category text,
  image_path text,
  status text default 'dream' check (status in ('dream','researching','planned','completed','archived')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.pets (
  id uuid primary key default gen_random_uuid(),
  household_id text references app.households(id) on delete cascade,
  name text not null,
  pet_type text default 'dog',
  birth_date date,
  photo_path text,
  feeding_notes text,
  medical_notes text,
  vaccination_notes text,
  vet_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.pet_sitters (
  id uuid primary key default gen_random_uuid(),
  household_id text references app.households(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  daily_rate numeric(12,2),
  hourly_rate numeric(12,2),
  rating int check (rating between 0 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_profile_id text references app.profiles(id) on delete set null,
  household_id text references app.households(id) on delete set null,
  action text not null,
  table_name text,
  row_id text,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Helpers ----------
create or replace function app.current_app_user()
returns app.app_users
language sql
stable
security definer
set search_path = app, public
as $$
  select * from app.app_users where auth_user_id = auth.uid() and approved = true limit 1;
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select exists(select 1 from app.app_users where auth_user_id = auth.uid() and role='admin' and approved=true);
$$;

create or replace function app.current_profile_id()
returns text
language sql
stable
security definer
set search_path = app, public
as $$
  select profile_id from app.app_users where auth_user_id = auth.uid() and approved=true limit 1;
$$;

create or replace function app.current_household_id()
returns text
language sql
stable
security definer
set search_path = app, public
as $$
  select household_id from app.app_users where auth_user_id = auth.uid() and approved=true limit 1;
$$;

create or replace function app.can_access_household(hid text)
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select app.is_admin() or exists(
    select 1 from app.app_users u
    where u.auth_user_id = auth.uid() and u.approved=true and u.household_id = hid
  );
$$;

create or replace function app.can_manage_household(hid text)
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select app.is_admin() or exists(
    select 1 from app.app_users u
    where u.auth_user_id = auth.uid() and u.approved=true and u.household_id = hid and u.role in ('admin','household_lead')
  );
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['households','profiles','profile_private','app_users','planner_state','trips','itinerary_items','budget_lines','profile_loyalty_accounts','deals','bucket_items','pets','pet_sitters'] loop
    execute format('drop trigger if exists trg_touch_%I on app.%I', t, t);
    execute format('create trigger trg_touch_%I before update on app.%I for each row execute function app.touch_updated_at()', t, t);
  end loop;
end $$;
