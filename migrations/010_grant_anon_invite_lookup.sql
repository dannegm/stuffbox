-- Migration 010 — Grant anon access to look up invites by token
-- Run in Supabase SQL Editor

grant usage on schema stuffbox to anon;
grant execute on function stuffbox.get_invite_by_token(text) to anon;
