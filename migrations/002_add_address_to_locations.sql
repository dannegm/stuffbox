-- Migration 002 — Add address to locations
-- Run in Supabase SQL Editor

alter table stuffbox.locations
  add column if not exists address text;
