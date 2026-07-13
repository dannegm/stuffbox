-- Migration 007 — Add color to workspaces
-- Run in Supabase SQL Editor

-- Replaces the client-side hash placeholder (src/helpers/workspace-color.js)
-- with a real, owner-editable value. Nullable — existing workspaces without
-- one keep falling back to the hash until the owner picks a color.
alter table stuffbox.workspaces
  add column if not exists color text;
