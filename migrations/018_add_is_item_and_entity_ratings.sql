-- Migration 018 — Add is_item to locations and create entity_ratings table for the swipe/rate deck feature
-- Run in Supabase SQL Editor

alter table stuffbox.locations
  add column if not exists is_item boolean not null default false;

-- Polymorphic like/dislike ratings for the swipe/rate deck — entity_id points
-- to either items or locations (is_item = true), same pattern as
-- movement_log's entity_type/entity_id. Unique per (entity, profile) so a
-- re-swipe upserts the existing vote instead of creating a duplicate.
create table if not exists stuffbox.entity_ratings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null references stuffbox.workspaces(id) on delete cascade,
  entity_type  text not null,                       -- 'item' | 'location'
  entity_id    text not null,                        -- no hard FK — see comment above
  profile_id   uuid not null references stuffbox.profiles(uuid) on delete cascade,
  liked        boolean not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, entity_id, profile_id)
);

alter table stuffbox.entity_ratings enable row level security;

create policy "entity_ratings: member access"
  on stuffbox.entity_ratings for all
  using (stuffbox.is_workspace_member(workspace_id, auth.uid()))
  with check (stuffbox.is_workspace_member(workspace_id, auth.uid()));

create policy "entity_ratings: admin full access"
  on stuffbox.entity_ratings for all
  using (stuffbox.requesting_user_is_admin())
  with check (stuffbox.requesting_user_is_admin());

create index if not exists idx_entity_ratings_workspace_id on stuffbox.entity_ratings (workspace_id);
create index if not exists idx_entity_ratings_entity        on stuffbox.entity_ratings (entity_type, entity_id);
create index if not exists idx_entity_ratings_profile_id    on stuffbox.entity_ratings (profile_id);
