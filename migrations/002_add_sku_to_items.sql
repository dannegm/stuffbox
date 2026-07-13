-- Migration 002 — Add sku to items
-- Run in Supabase SQL Editor

alter table stuffbox.items
  add column if not exists sku text;
