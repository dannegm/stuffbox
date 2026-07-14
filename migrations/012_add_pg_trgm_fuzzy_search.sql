-- Migration 012 — Add pg_trgm fuzzy matching to stuffbox.search_workspace
-- Run in Supabase SQL Editor

-- Typo-tolerant name matching ("macbuc" → "MacBook") alongside the existing
-- substring ilike match, not instead of it — trigram similarity is unreliable
-- for very short queries (SKUs, 2-3 char strings), so ilike stays as the
-- guaranteed-match fallback and word_similarity only adds the fuzzy net.
-- word_similarity (not plain similarity) because it scores the best-matching
-- word/substring within the target name rather than the whole string, which
-- matters since names are often longer than the search query (e.g. "MacBook
-- Pro 13 2021" vs "macbuc").
create extension if not exists pg_trgm;

-- Trigram GIN indexes double as an ilike '%...%' accelerator (pg_trgm's
-- documented use case) — a bonus on top of enabling the fuzzy match itself.
create index if not exists idx_locations_name_trgm
  on stuffbox.locations using gin (name gin_trgm_ops);
create index if not exists idx_items_name_trgm
  on stuffbox.items using gin (name gin_trgm_ops);

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
      and (
        p_query is null
        or l.name ilike '%' || p_query || '%'
        or word_similarity(p_query, l.name) > 0.3
      )
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
      and (
        p_query is null
        or i.name ilike '%' || p_query || '%'
        or word_similarity(p_query, i.name) > 0.3
      )
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
  order by
    case when p_query is not null then word_similarity(p_query, c.name) end desc nulls last,
    c.name
  limit p_limit offset p_offset;
$$;

grant execute on function stuffbox.search_workspace(text, text, uuid[], text, boolean, text, int, int) to authenticated;
