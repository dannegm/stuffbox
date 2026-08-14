-- Migration 027 — Reinstate is_container alongside is_item
-- Run in Supabase SQL Editor

-- is_container is reinstated as its own, independently-settable flag —
-- until now every write only ever set it from CONTAINER_TYPES (box/shelf/
-- toolbox/baggage) at create/edit time, so a location that had its "aparece
-- en el deck de calificar" (is_item) switch turned on by hand (not by type)
-- may still have is_container = false. Both flags now gate the same
-- descriptive fields (photo/description/orientation/valor sentimental) and
-- is_item implies is_container going forward (enforced in the app, not a DB
-- constraint) — this catches up existing rows so none of them silently lose
-- those fields.
update stuffbox.locations set is_container = true where is_item = true and is_container = false;

-- convert_item_to_location always forced is_item = true (a promoted item
-- keeps showing up in the swipe/rate deck) but left is_container to the
-- caller-supplied p_is_container (computed from p_type via isContainerType)
-- — now that is_item implies is_container, that's not enough: promoting an
-- item to a non-container type (e.g. 'room') would still need is_container
-- true. The parameter is dropped and is_container is hardcoded true
-- alongside is_item instead.
drop function if exists stuffbox.convert_item_to_location(text, text, text, boolean);

create or replace function stuffbox.convert_item_to_location(
  p_item_id     text,
  p_location_id text,
  p_type        text
)
returns stuffbox.locations
language plpgsql
as $$
declare
  v_item     stuffbox.items;
  v_location stuffbox.locations;
begin
  select * into v_item from stuffbox.items where id = p_item_id;
  if not found then
    raise exception 'item % not found', p_item_id;
  end if;

  insert into stuffbox.locations (
    id, workspace_id, parent_id, name, type, icon, active_move_id,
    is_container, is_item, description, is_fragile, storage_orientation,
    sentimental_value
  ) values (
    p_location_id, v_item.workspace_id, v_item.location_id, v_item.name, p_type,
    v_item.icon, v_item.active_move_id, true, true, v_item.description,
    v_item.is_fragile, v_item.storage_orientation, v_item.sentimental_value
  )
  returning * into v_location;

  insert into stuffbox.location_photos (
    location_id, r2_key, crop_x, crop_y, zoom, rotation, flip_x, flip_y, "order"
  )
  select p_location_id, r2_key, crop_x, crop_y, zoom, rotation, flip_x, flip_y, "order"
  from stuffbox.item_photos
  where item_id = p_item_id;

  delete from stuffbox.items where id = p_item_id;

  return v_location;
end;
$$;

grant execute on function stuffbox.convert_item_to_location(text, text, text) to authenticated;
