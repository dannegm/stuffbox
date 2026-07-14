-- Migration 013 — Type/casa filters on stuffbox.search_workspace become multi-select
-- Run in Supabase SQL Editor

-- drop first: p_type (text) and p_house_id (text) become p_type_ids/p_house_ids
-- (text[]) — a changed argument type is a new overload as far as postgres is
-- concerned, not a replace, so the old single-value signature is dropped
-- explicitly to avoid leaving a stale duplicate function behind.
drop function if exists stuffbox.search_workspace(text, text, uuid[], text, boolean, text, int, int);

-- Same union/recursive-ancestor/count shape as before (see migration 011) —
-- only the type/house filters change, from a single value to "any of these".
create or replace function stuffbox.search_workspace(
  p_workspace_id text,
  p_query        text default null,
  p_tag_ids      uuid[] default null,
  p_type_ids     text[] default null,
  p_packed       boolean default null,
  p_house_ids    text[] default null,
  p_limit        int default 25,
  p_offset       int default 0
)
returns table (
  kind        text,
  id          text,
  total_count bigint
)
language sql
stable
as $$
  with recursive location_roots as (
    select l.id, l.id as root_id
    from stuffbox.locations l
    where l.parent_id is null and l.workspace_id = p_workspace_id
    union all
    select l.id, lr.root_id
    from stuffbox.locations l
    join location_roots lr on l.parent_id = lr.id
    where l.workspace_id = p_workspace_id
  ),
  matched_locations as (
    select 'location'::text as kind, l.id, l.name
    from stuffbox.locations l
    join location_roots lr on lr.id = l.id
    where l.workspace_id = p_workspace_id
      and p_tag_ids is null
      and (
        p_query is null
        or l.name ilike '%' || p_query || '%'
        or word_similarity(p_query, l.name) > 0.3
      )
      and (p_type_ids is null or l.type = any(p_type_ids))
      and (p_packed is null or (l.active_move_id is not null) = p_packed)
      and (p_house_ids is null or lr.root_id = any(p_house_ids))
  ),
  matched_items as (
    select 'item'::text as kind, i.id, i.name
    from stuffbox.items i
    join location_roots lr on lr.id = i.location_id
    where i.workspace_id = p_workspace_id
      and p_type_ids is null
      and (
        p_query is null
        or i.name ilike '%' || p_query || '%'
        or word_similarity(p_query, i.name) > 0.3
      )
      and (p_packed is null or (i.active_move_id is not null) = p_packed)
      and (p_house_ids is null or lr.root_id = any(p_house_ids))
      and (
        p_tag_ids is null
        or exists (
          select 1 from stuffbox.item_tags it
          where it.item_id = i.id and it.tag_id = any(p_tag_ids)
        )
      )
  ),
  combined as (
    select * from matched_locations
    union all
    select * from matched_items
  )
  select c.kind, c.id, count(*) over() as total_count
  from combined c
  order by
    case when p_query is not null then word_similarity(p_query, c.name) end desc nulls last,
    c.name
  limit p_limit offset p_offset;
$$;

grant execute on function stuffbox.search_workspace(text, text, uuid[], text[], boolean, text[], int, int) to authenticated;
