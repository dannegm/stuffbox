-- Migration 014 — Add per-workspace collaboration settings and tighten related RLS
-- Run in Supabase SQL Editor

-- Helper: does this workspace's 'collaborationSettings' value allow regular
-- members (not just the owner) to create invite links? Missing key/value
-- coalesces to false — the safe default, matching how the setting is absent
-- for every existing workspace until an owner explicitly turns it on.
create or replace function stuffbox.workspace_allows_member_invites(p_workspace_id text)
returns boolean as $$
  select coalesce(
    (
      select (value->>'allowMemberInvites')::boolean
      from stuffbox.workspace_settings
      where workspace_id = p_workspace_id and key = 'collaborationSettings'
    ),
    false
  );
$$ language sql security definer stable;

-- Helper: same shape, for "can regular members remove other members?" —
-- deletion of the owner's own row is still blocked elsewhere regardless of
-- this setting (see the workspace_members delete policy below).
create or replace function stuffbox.workspace_allows_member_removal(p_workspace_id text)
returns boolean as $$
  select coalesce(
    (
      select (value->>'allowMemberRemove')::boolean
      from stuffbox.workspace_settings
      where workspace_id = p_workspace_id and key = 'collaborationSettings'
    ),
    false
  );
$$ language sql security definer stable;

-- workspace_invites: split the old blanket "member access" (for all) into
-- select/insert/delete — deleting an invite must stay owner-only no matter
-- what, creating one can be relaxed to regular members via the new setting.
drop policy if exists "workspace_invites: member access" on stuffbox.workspace_invites;

create policy "workspace_invites: member select"
  on stuffbox.workspace_invites for select
  using (stuffbox.is_workspace_member(workspace_id, auth.uid()));

create policy "workspace_invites: owner or allowed member insert"
  on stuffbox.workspace_invites for insert
  with check (
    stuffbox.is_workspace_member(workspace_id, auth.uid())
    and (
      exists (
        select 1 from stuffbox.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
      or stuffbox.workspace_allows_member_invites(workspace_id)
    )
  );

create policy "workspace_invites: owner delete"
  on stuffbox.workspace_invites for delete
  using (
    exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- workspace_members: allow a regular member to remove OTHER members (never
-- the owner) when the new setting permits it, alongside the existing
-- self-leave and owner-removes-anyone cases.
drop policy if exists "workspace_members: owner or self delete" on stuffbox.workspace_members;

create policy "workspace_members: owner, self, or allowed member delete"
  on stuffbox.workspace_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
    or (
      stuffbox.workspace_allows_member_removal(workspace_id)
      and stuffbox.is_workspace_member(workspace_id, auth.uid())
      and not exists (
        select 1 from stuffbox.workspaces w
        where w.id = workspace_id and w.owner_id = workspace_members.user_id
      )
    )
  );

-- workspace_settings: split the old blanket "member access" (for all) so the
-- 'collaborationSettings' key specifically is owner-write-only — otherwise
-- any member could grant themselves the two permissions above directly via
-- the API, bypassing the settings-page owner gate entirely. Every other key
-- (e.g. mapDefaultViewport) stays member-writable exactly as before.
drop policy if exists "workspace_settings: member access" on stuffbox.workspace_settings;

create policy "workspace_settings: member select"
  on stuffbox.workspace_settings for select
  using (stuffbox.is_workspace_member(workspace_id, auth.uid()));

create policy "workspace_settings: member write other keys"
  on stuffbox.workspace_settings for insert
  with check (
    stuffbox.is_workspace_member(workspace_id, auth.uid())
    and key <> 'collaborationSettings'
  );

create policy "workspace_settings: member update other keys"
  on stuffbox.workspace_settings for update
  using (
    stuffbox.is_workspace_member(workspace_id, auth.uid())
    and key <> 'collaborationSettings'
  )
  with check (
    stuffbox.is_workspace_member(workspace_id, auth.uid())
    and key <> 'collaborationSettings'
  );

create policy "workspace_settings: owner write collaboration key"
  on stuffbox.workspace_settings for insert
  with check (
    key = 'collaborationSettings'
    and exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "workspace_settings: owner update collaboration key"
  on stuffbox.workspace_settings for update
  using (
    key = 'collaborationSettings'
    and exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  )
  with check (
    key = 'collaborationSettings'
    and exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );
