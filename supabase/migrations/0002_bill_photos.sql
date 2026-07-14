-- Persist bill photos captured via the photo-entry flow.
-- Run this in the Supabase SQL editor after 0001_init.sql.

alter table public.purchases add column bill_image_path text;

-- Private bucket for scanned bill photos (photo-entry flow only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bill-photos', 'bill-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Any authenticated user can upload a bill photo (mirrors purchases_staff_insert:
-- staff can create purchase records, so they can attach the bill that backs one).
create policy bill_photos_authenticated_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bill-photos');

-- Any authenticated user can view bill photos (mirrors purchases_staff_select:
-- all staff can already read every purchase, so they can read the bill behind it).
create policy bill_photos_authenticated_select on storage.objects for select to authenticated
  using (bucket_id = 'bill-photos');
