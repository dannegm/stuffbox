-- Migration 022 — Add search_terms and related_icons to tags
-- Run in Supabase SQL Editor

alter table stuffbox.tags
  add column if not exists search_terms text[] not null default '{}',
  add column if not exists related_icons jsonb not null default '[]'::jsonb;
