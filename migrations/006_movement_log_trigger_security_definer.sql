-- Migration 006 — Fix movement_log triggers to run as security definer
-- Run in Supabase SQL Editor

-- movement_log intentionally has no member INSERT policy (db.sql: "written
-- by a trigger, not app logic") — but the trigger functions were never
-- declared security definer, so they ran as the invoking (non-admin) user
-- and got blocked by RLS on every location_id/parent_id/active_move_id
-- change (transfer, pack, unpack — including drag-and-drop). Adding
-- security definer lets the trigger itself write the audit row regardless
-- of the calling user's own grants on movement_log.

create or replace function stuffbox.log_item_movement()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.location_id is distinct from OLD.location_id
     or NEW.active_move_id is distinct from OLD.active_move_id then
    insert into stuffbox.movement_log
      (workspace_id, entity_type, entity_id, from_location_id, to_location_id, move_id)
    values
      (NEW.workspace_id, 'item', NEW.id, OLD.location_id, NEW.location_id, NEW.active_move_id);
  end if;
  return NEW;
end;
$$;

create or replace function stuffbox.log_location_movement()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.parent_id is distinct from OLD.parent_id
     or NEW.active_move_id is distinct from OLD.active_move_id then
    insert into stuffbox.movement_log
      (workspace_id, entity_type, entity_id, from_location_id, to_location_id, move_id)
    values
      (NEW.workspace_id, 'location', NEW.id, OLD.parent_id, NEW.parent_id, NEW.active_move_id);
  end if;
  return NEW;
end;
$$;
