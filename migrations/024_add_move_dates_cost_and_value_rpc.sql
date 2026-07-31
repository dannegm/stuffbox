-- Migration 024 — Add move dates/cost and a move value rollup RPC
-- Run in Supabase SQL Editor

alter table stuffbox.moves
  add column if not exists cost                   numeric,  -- null = N/A until set via the summary box's edit button
  add column if not exists started_at              date,     -- set alongside estimated_completion_at when status -> in_transit
  add column if not exists estimated_completion_at  date,     -- the deadline asked for in the same dialog as started_at
  add column if not exists completed_at             date;     -- auto-set to today when status -> done

-- Same pattern as stuffbox.location_total_price (recursive subtree over
-- locations), but seeded from every location flagged into this move (not a
-- single location id), plus loose items packed directly into the move —
-- boxed items inherit their box's move state so they never carry
-- active_move_id themselves (see packedInMoveQuery, src/queries/moves.js).
create or replace function stuffbox.move_total_value(p_move_id text)
returns numeric
language sql
stable
as $$
  with recursive subtree as (
    select id from stuffbox.locations where active_move_id = p_move_id
    union all
    select l.id from stuffbox.locations l
    join subtree s on l.parent_id = s.id
  )
  select
    coalesce((select sum(i.purchase_price) from stuffbox.items i where i.active_move_id = p_move_id), 0)
    + coalesce((select sum(i.purchase_price) from stuffbox.items i where i.location_id in (select id from subtree)), 0);
$$;

grant execute on function stuffbox.move_total_value(text) to authenticated;
