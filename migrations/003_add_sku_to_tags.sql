-- Migration 003 — Add sku to tags
-- Run in Supabase SQL Editor

alter table stuffbox.tags
  add column if not exists sku text;
