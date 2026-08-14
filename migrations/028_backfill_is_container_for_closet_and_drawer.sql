-- Migration 028 — Backfill is_container for closet and drawer
-- Run in Supabase SQL Editor

-- CONTAINER_TYPES (the app's smart-default list for is_container at create
-- time) grows to include closet/drawer alongside box/shelf/toolbox/baggage —
-- they're storage furniture, not a spatial place you'd walk into like a
-- room. Existing closet/drawer locations created under the old, narrower
-- list never got is_container set, so catch them up the same way 027 did
-- for is_item.
update stuffbox.locations set is_container = true where type in ('closet', 'drawer') and is_container = false;
