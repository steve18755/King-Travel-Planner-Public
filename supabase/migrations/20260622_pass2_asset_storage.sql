-- King Family Travel Planner - Pass 2 asset/storage readiness
-- Purpose: create a secure metadata layer for private family assets and prepare Supabase Storage buckets.

create extension if not exists pgcrypto;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists app.asset_files (
  id uuid primary key default gen_random_uuid(),
  household_id text not null references app.households(id) on delete cascade,
  owner_profile_id text references app.profiles(id) on delete set null,
  bucket text not null,
  storage_path text not null,
  asset_kind text not null,
  display_name text,
  mime_type text,
  size_bytes bigint,
  is_sensitive boolean not null default true,
  linked_table text,
  linked_id text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_files_bucket_path_key unique (bucket, storage_path),
  constraint asset_files_kind_check check (
    asset_kind = any(array[
      'public_asset',
      'profile_photo',
      'loyalty_card',
      'airline_award_card',
      'casino_card',
      'passport_image',
      'travel_document',
      'trip_pdf',
      'trip_attachment',
      'pet_photo',
      'dog_sitter_rate_sheet',
      'other'
    ]::text[])
  )
);

create index if not exists asset_files_household_idx on app.asset_files(household_id);
create index if not exists asset_files_owner_profile_idx on app.asset_files(owner_profile_id);
create index if not exists asset_files_linked_idx on app.asset_files(linked_table, linked_id);
create index if not exists asset_files_kind_idx on app.asset_files(asset_kind);

drop trigger if exists trg_touch_asset_files on app.asset_files;
create trigger trg_touch_asset_files
before update on app.asset_files
for each row execute function app.touch_updated_at();

alter table app.asset_files enable row level security;

drop policy if exists asset_files_select_household on app.asset_files;
drop policy if exists asset_files_insert_household on app.asset_files;
drop policy if exists asset_files_update_household_admin_or_owner on app.asset_files;
drop policy if exists asset_files_delete_household_admin_or_owner on app.asset_files;

create policy asset_files_select_household
on app.asset_files
for select
to authenticated
using (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = asset_files.household_id
  )
);

create policy asset_files_insert_household
on app.asset_files
for insert
to authenticated
with check (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = asset_files.household_id
  )
  and (uploaded_by is null or uploaded_by = auth.uid())
);

create policy asset_files_update_household_admin_or_owner
on app.asset_files
for update
to authenticated
using (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = asset_files.household_id
      and (au.role in ('admin','household_lead') or asset_files.uploaded_by = auth.uid())
  )
)
with check (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = asset_files.household_id
      and (au.role in ('admin','household_lead') or asset_files.uploaded_by = auth.uid())
  )
);

create policy asset_files_delete_household_admin_or_owner
on app.asset_files
for delete
to authenticated
using (
  exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = asset_files.household_id
      and (au.role in ('admin','household_lead') or asset_files.uploaded_by = auth.uid())
  )
);

grant select, insert, update, delete on app.asset_files to authenticated;
grant all on app.asset_files to service_role;

-- Storage buckets. These names are intentionally stable and referenced by the asset diagnostics module.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('kftp-public-assets', 'kftp-public-assets', true, 52428800, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']::text[]),
  ('kftp-profile-photos', 'kftp-profile-photos', false, 52428800, array['image/png','image/jpeg','image/webp']::text[]),
  ('kftp-loyalty-cards', 'kftp-loyalty-cards', false, 52428800, array['image/png','image/jpeg','image/webp','application/pdf']::text[]),
  ('kftp-travel-documents', 'kftp-travel-documents', false, 104857600, array['image/png','image/jpeg','image/webp','application/pdf']::text[]),
  ('kftp-trip-attachments', 'kftp-trip-attachments', false, 104857600, array['image/png','image/jpeg','image/webp','application/pdf','text/plain']::text[]),
  ('kftp-pet-care', 'kftp-pet-care', false, 52428800, array['image/png','image/jpeg','image/webp','application/pdf','text/plain']::text[])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket read policy.
drop policy if exists kftp_public_assets_read on storage.objects;
create policy kftp_public_assets_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'kftp-public-assets');

-- Household-private bucket policies. Store private objects under a household prefix:
--   stephen_household/profile-photos/stephen_king/photo.jpg
--   stephen_household/trips/<trip_id>/confirmation.pdf
-- The first path segment must match app.app_users.household_id.
drop policy if exists kftp_private_assets_read_household on storage.objects;
drop policy if exists kftp_private_assets_insert_household on storage.objects;
drop policy if exists kftp_private_assets_update_household on storage.objects;
drop policy if exists kftp_private_assets_delete_household on storage.objects;

create policy kftp_private_assets_read_household
on storage.objects
for select
to authenticated
using (
  bucket_id in ('kftp-profile-photos','kftp-loyalty-cards','kftp-travel-documents','kftp-trip-attachments','kftp-pet-care')
  and exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = split_part(storage.objects.name, '/', 1)
  )
);

create policy kftp_private_assets_insert_household
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('kftp-profile-photos','kftp-loyalty-cards','kftp-travel-documents','kftp-trip-attachments','kftp-pet-care')
  and exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = split_part(storage.objects.name, '/', 1)
  )
);

create policy kftp_private_assets_update_household
on storage.objects
for update
to authenticated
using (
  bucket_id in ('kftp-profile-photos','kftp-loyalty-cards','kftp-travel-documents','kftp-trip-attachments','kftp-pet-care')
  and exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = split_part(storage.objects.name, '/', 1)
      and au.role in ('admin','household_lead')
  )
)
with check (
  bucket_id in ('kftp-profile-photos','kftp-loyalty-cards','kftp-travel-documents','kftp-trip-attachments','kftp-pet-care')
  and exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = split_part(storage.objects.name, '/', 1)
      and au.role in ('admin','household_lead')
  )
);

create policy kftp_private_assets_delete_household
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('kftp-profile-photos','kftp-loyalty-cards','kftp-travel-documents','kftp-trip-attachments','kftp-pet-care')
  and exists (
    select 1
    from app.app_users au
    where au.auth_user_id = auth.uid()
      and au.approved = true
      and au.household_id = split_part(storage.objects.name, '/', 1)
      and au.role in ('admin','household_lead')
  )
);

notify pgrst, 'reload schema';
