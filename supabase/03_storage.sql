-- King Family Travel Planner v7.0 Storage buckets and policies
-- Run after 01_schema.sql and 02_rls_policies.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos','profile-photos', false, 10485760, array['image/png','image/jpeg','image/webp']),
  ('pet-photos','pet-photos', false, 10485760, array['image/png','image/jpeg','image/webp']),
  ('trip-photos','trip-photos', false, 52428800, array['image/png','image/jpeg','image/webp']),
  ('trip-documents','trip-documents', false, 52428800, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('secure-identity-documents','secure-identity-documents', false, 52428800, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Remove prior app policies if re-running.
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'kftp_%' loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Family-visible media buckets: authenticated/approved users can read non-identity media.
create policy kftp_media_read_approved
on storage.objects for select
using (
  bucket_id in ('profile-photos','pet-photos','trip-photos','trip-documents')
  and exists(select 1 from app.app_users u where u.auth_user_id=auth.uid() and u.approved=true)
);

-- Authenticated/approved users can upload to regular media buckets.
create policy kftp_media_insert_approved
on storage.objects for insert
with check (
  bucket_id in ('profile-photos','pet-photos','trip-photos','trip-documents')
  and exists(select 1 from app.app_users u where u.auth_user_id=auth.uid() and u.approved=true)
);

-- Users can update/delete objects they own; admins can manage all app buckets.
create policy kftp_media_update_owner_admin
on storage.objects for update
using (
  bucket_id in ('profile-photos','pet-photos','trip-photos','trip-documents')
  and (owner = auth.uid() or app.is_admin())
)
with check (owner = auth.uid() or app.is_admin());

create policy kftp_media_delete_owner_admin
on storage.objects for delete
using (
  bucket_id in ('profile-photos','pet-photos','trip-photos','trip-documents')
  and (owner = auth.uid() or app.is_admin())
);

-- Identity documents: folder must start with auth.uid(); admins can manage all.
create policy kftp_identity_read_self_admin
on storage.objects for select
using (
  bucket_id = 'secure-identity-documents'
  and (app.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

create policy kftp_identity_insert_self_admin
on storage.objects for insert
with check (
  bucket_id = 'secure-identity-documents'
  and (app.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

create policy kftp_identity_update_self_admin
on storage.objects for update
using (
  bucket_id = 'secure-identity-documents'
  and (app.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
)
with check (app.is_admin() or (storage.foldername(name))[1] = auth.uid()::text);

create policy kftp_identity_delete_self_admin
on storage.objects for delete
using (
  bucket_id = 'secure-identity-documents'
  and (app.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);
