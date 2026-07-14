-- Migration 011 — Add stuffbox.search_workspace RPC for the workspace-level search page
-- Run in Supabase SQL Editor

-- drop first: an earlier draft of this function had a different RETURNS TABLE
-- shape, and create-or-replace can't change a function's output columns.
drop function if exists stuffbox.search_workspace(text, text, uuid[], text, boolean, text, int, int);

-- Resolves only the ordered (kind, id) pairs + total_count for a workspace
-- search — the one thing that needs real SQL (union across two tables, a
-- recursive ancestor walk for the house filter, and a single shared count).
-- The app fetches full item/location rows for this page's ids separately via
-- plain direct-client selects (same shape as itemsAtLocationQuery /
-- locationChildrenQuery), so search results carry the same photos/tags/
-- fields as their native list views instead of a stripped-down shape.
--
-- Plain invoker rights (no security definer), same pattern as
-- stuffbox.location_total_price — RLS on locations/items already scopes this
-- to what the caller can see. Type only applies to locations (items have no
-- `type` column) and tags only apply to items (locations have no tags), so
-- each side excludes itself entirely when the other's filter is active.
create or replace function stuffbox.search_workspace(
  p_workspace_id text,
  p_query        text default null,
  p_tag_ids      uuid[] default null,
  p_type         text default null,
  p_packed       boolean default null,
  p_house_id     text default null,
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
      and (p_query is null or l.name ilike '%' || p_query || '%')
      and (p_type is null or l.type = p_type)
      and (p_packed is null or (l.active_move_id is not null) = p_packed)
      and (p_house_id is null or lr.root_id = p_house_id)
  ),
  matched_items as (
    select 'item'::text as kind, i.id, i.name
    from stuffbox.items i
    join location_roots lr on lr.id = i.location_id
    where i.workspace_id = p_workspace_id
      and p_type is null
      and (p_query is null or i.name ilike '%' || p_query || '%')
      and (p_packed is null or (i.active_move_id is not null) = p_packed)
      and (p_house_id is null or lr.root_id = p_house_id)
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
  order by c.name
  limit p_limit offset p_offset;
$$;

grant execute on function stuffbox.search_workspace(text, text, uuid[], text, boolean, text, int, int) to authenticated;
