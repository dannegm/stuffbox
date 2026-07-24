-- Migration 020 — Add rotation/flip_x/flip_y orientation columns to item_photos and location_photos
-- Run in Supabase SQL Editor

alter table stuffbox.item_photos
  add column if not exists rotation int not null default 0,
  add column if not exists flip_x boolean not null default false,
  add column if not exists flip_y boolean not null default false;

alter table stuffbox.location_photos
  add column if not exists rotation int not null default 0,
  add column if not exists flip_x boolean not null default false,
  add column if not exists flip_y boolean not null default false;
