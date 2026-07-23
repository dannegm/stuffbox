-- Migration 017 — Search items by sku in stuffbox.search_workspace
-- Run in Supabase SQL Editor

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
        or i.sku ilike '%' || p_query || '%'
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

create index if not exists idx_items_sku_trgm on stuffbox.items using gin (sku gin_trgm_ops);
