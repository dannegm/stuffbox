-- Migration 029 — Add ancestor_names path to search_workspace results
-- Run in Supabase SQL Editor

-- Table-returning function's output columns are changing (new
-- ancestor_names text[] column), so create or replace isn't enough —
-- Postgres requires dropping first.
drop function if exists stuffbox.search_workspace(text, text, uuid[], text[], boolean, text[], int, int);

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
  kind             text,
  id               text,
  effective_move_id text,
  move_owner_kind  text,
  ancestor_names   text[],
  total_count      bigint
)
language sql
stable
as $$
  -- location_roots also carries `effective_move_id` top-down: the nearest
  -- packed ancestor's active_move_id (own value wins), same inheritance rule
  -- as src/helpers/moves.js getInheritedPackedMoveId — boxed items/locations
  -- don't carry their own active_move_id, only the box that was actually
  -- packed does.
  --
  -- Also carries `ancestor_names` top-down: an ordered root-to-immediate
  -- text[] of the *ancestors'* own names, not including the current node —
  -- each recursion step appends the parent's name (lr.name), so a row's
  -- own ancestor_names never includes itself. Used to render a breadcrumb
  -- second line in search results (src/queries/search.js).
  with recursive location_roots as (
    select l.id, l.id as root_id, l.active_move_id as effective_move_id,
           l.name, array[]::text[] as ancestor_names
    from stuffbox.locations l
    where l.parent_id is null and l.workspace_id = p_workspace_id
    union all
    select l.id, lr.root_id, coalesce(l.active_move_id, lr.effective_move_id),
           l.name, lr.ancestor_names || lr.name
    from stuffbox.locations l
    join location_roots lr on l.parent_id = lr.id
    where l.workspace_id = p_workspace_id
  ),
  matched_locations as (
    select
      'location'::text as kind,
      l.id,
      l.name,
      lr.effective_move_id,
      -- Always 'location' when packed — a location's own active_move_id and
      -- every one of its ancestors are locations too.
      (case when lr.effective_move_id is not null then 'location' end)::text as move_owner_kind,
      -- Location's own name is already the row title, so its path only
      -- lists what's above it — empty for a root/house location.
      lr.ancestor_names
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
      and (p_packed is null or (lr.effective_move_id is not null) = p_packed)
      and (p_house_ids is null or lr.root_id = any(p_house_ids))
  ),
  matched_items as (
    select
      'item'::text as kind,
      i.id,
      i.name,
      coalesce(i.active_move_id, lr.effective_move_id) as effective_move_id,
      -- 'item' when the item itself is loose-packed, 'location' when it's
      -- only packed because a containing box is.
      (case
         when i.active_move_id is not null then 'item'
         when lr.effective_move_id is not null then 'location'
       end)::text as move_owner_kind,
      -- Append the item's direct containing location's own name — that
      -- location is the last/direct segment of an item's path, unlike a
      -- location result where the row's own name already covers that.
      lr.ancestor_names || lr.name as ancestor_names
    from stuffbox.items i
    join location_roots lr on lr.id = i.location_id
    where i.workspace_id = p_workspace_id
      and p_type_ids is null
      and (
        p_query is null
        or i.name ilike '%' || p_query || '%'
        or word_similarity(p_query, i.name) > 0.3
        or i.sku ilike '%' || p_query || '%'
      )
      and (
        p_packed is null
        or (coalesce(i.active_move_id, lr.effective_move_id) is not null) = p_packed
      )
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
  select c.kind, c.id, c.effective_move_id, c.move_owner_kind, c.ancestor_names, count(*) over() as total_count
  from combined c
  order by
    case when p_query is not null then word_similarity(p_query, c.name) end desc nulls last,
    c.name
  limit p_limit offset p_offset;
$$;

grant execute on function stuffbox.search_workspace(text, text, uuid[], text[], boolean, text[], int, int) to authenticated;
