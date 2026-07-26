-- Migration 021 — Add RPC to atomically convert an item into a location
-- Run in Supabase SQL Editor

-- "Promote an item to a location" — item edit screen action. Runs as one
-- plpgsql transaction so the item is never lost between steps: create the
-- location (as a sibling inside the item's current container), copy its
-- photos over, then delete it. Plain invoker rights (no security definer),
-- same reasoning as location_total_price/search_workspace — RLS on
-- items/locations/location_photos already scopes every statement here to
-- what the calling user can see/write. is_container is passed in (computed
-- client-side via isContainerType, same as createLocationMutation/
-- updateLocationMutation) rather than re-derived from p_type in SQL.
-- is_item is always forced true so the promoted location keeps showing up
-- in the swipe/rate deck, same as the item did. Tags don't carry over —
-- there's no location_tags equivalent; item_tags cascades away with the item.
create or replace function stuffbox.convert_item_to_location(
  p_item_id      text,
  p_location_id  text,
  p_type         text,
  p_is_container boolean
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
    v_item.icon, v_item.active_move_id, p_is_container, true, v_item.description,
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

grant execute on function stuffbox.convert_item_to_location(text, text, text, boolean) to authenticated;
