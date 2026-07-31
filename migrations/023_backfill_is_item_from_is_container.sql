-- Migration 023 — Backfill is_item from is_container
-- Run in Supabase SQL Editor

-- is_item is now the sole flag the app reads to gate pack/unpack eligibility
-- and the total-price rollup display (previously gated by is_container,
-- auto-derived from location type). Without this backfill, existing
-- box/shelf/toolbox/baggage locations that never had "aparece en el deck de
-- calificar" turned on manually would silently lose their pack/unpack button
-- and total-price stat. is_container itself is untouched — still written on
-- create/update, just no longer read by the app for these behaviors.
update stuffbox.locations set is_item = true where is_container = true and is_item = false;
