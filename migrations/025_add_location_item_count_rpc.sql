-- Migration 025 — Add stuffbox.location_item_count RPC (recursive item count under a location)
-- Run in Supabase SQL Editor

create or replace function stuffbox.location_item_count(p_location_id text)
returns bigint
language sql
stable
as $$
  with recursive subtree as (
    select id from stuffbox.locations where id = p_location_id
    union all
    select l.id from stuffbox.locations l
    join subtree s on l.parent_id = s.id
  )
  select count(*)
  from stuffbox.items i
  where i.location_id in (select id from subtree);
$$;

grant execute on function stuffbox.location_item_count(text) to authenticated;
