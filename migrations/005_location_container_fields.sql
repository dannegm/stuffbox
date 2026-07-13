-- Migration 005 — Add container fields, photos, and price rollup to locations
-- Run in Supabase SQL Editor

alter table stuffbox.locations
  add column if not exists is_container boolean not null default false,
  add column if not exists description text,
  add column if not exists is_fragile boolean not null default false,
  add column if not exists storage_orientation text,
  add column if not exists sentimental_value smallint;

-- Backfill existing rows — box/shelf/toolbox/baggage default to containers.
update stuffbox.locations
  set is_container = true
  where type in ('box', 'shelf', 'toolbox', 'baggage') and is_container = false;

-- Square-masked at render, never physically cropped — same shape as
-- item_photos, just hanging off a location instead of an item.
create table if not exists stuffbox.location_photos (
  id          uuid primary key default gen_random_uuid(),
  location_id text not null references stuffbox.locations(id) on delete cascade,
  r2_key      text not null,
  crop_x      float not null default 0,
  crop_y      float not null default 0,
  zoom        float not null default 1,
  "order"     int not null default 0,
  created_at  timestamptz not null default now()
);

alter table stuffbox.location_photos enable row level security;

drop policy if exists "location_photos: member access" on stuffbox.location_photos;
create policy "location_photos: member access"
  on stuffbox.location_photos for all
  using (
    exists (
      select 1 from stuffbox.locations l
      where l.id = location_id and stuffbox.is_workspace_member(l.workspace_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from stuffbox.locations l
      where l.id = location_id and stuffbox.is_workspace_member(l.workspace_id, auth.uid())
    )
  );

drop policy if exists "location_photos: admin full access" on stuffbox.location_photos;
create policy "location_photos: admin full access"
  on stuffbox.location_photos for all
  using (stuffbox.requesting_user_is_admin())
  with check (stuffbox.requesting_user_is_admin());

create index if not exists idx_location_photos_location_id on stuffbox.location_photos (location_id);

-- Recursive sum of purchase_price across every item in this location's
-- subtree (nested boxes included, any depth). No security definer — plain
-- invoker rights mean the underlying RLS on locations/items already scopes
-- this to what the caller can see, so an out-of-workspace id just sums to 0
-- instead of leaking anything.
create or replace function stuffbox.location_total_price(p_location_id text)
returns numeric
language sql
stable
as $$
  with recursive subtree as (
    select id from stuffbox.locations where id = p_location_id
    union all
    select l.id from stuffbox.locations l
    join subtree s on l.parent_id = s.id
  )
  select coalesce(sum(i.purchase_price), 0)
  from stuffbox.items i
  where i.location_id in (select id from subtree);
$$;

grant execute on function stuffbox.location_total_price(text) to authenticated;
