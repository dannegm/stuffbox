-- Migration 004 — Fix items.active_move_id fk to on delete set null
-- Run in Supabase SQL Editor

-- Symmetric with locations.active_move_id (db.sql already has this). Without
-- it, deleting a move with packed loose items fails with a fk violation
-- instead of just unpacking them.
alter table stuffbox.items
  drop constraint if exists items_active_move_id_fkey;

alter table stuffbox.items
  add constraint items_active_move_id_fkey
  foreign key (active_move_id) references stuffbox.moves(id) on delete set null;
