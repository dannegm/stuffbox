-- Migration 019 — Add read-only RPC to look up an existing profile's identity by email
-- Run in Supabase SQL Editor

-- Mirrors get_invite_by_token: lets the register/invite email step recognize
-- an existing account and reflect its saved name/gender/avatar/color in the
-- UI before a session exists — read-only, no writes to profiles.
create or replace function stuffbox.get_profile_identity_by_email(p_email text)
returns table(name text, gender text, avatar_seed text, color text)
security definer stable language sql as $$
  select p.name, p.gender, p.avatar_seed, p.color
  from stuffbox.profiles p
  where p.email = p_email;
$$;

grant execute on function stuffbox.get_profile_identity_by_email(text) to authenticated;
grant execute on function stuffbox.get_profile_identity_by_email(text) to anon;
