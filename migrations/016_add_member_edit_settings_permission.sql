-- Migration 016 — Add collaborationSettings.allowMemberEditSettings and gate general settings writes on it
-- Run in Supabase SQL Editor

-- Helper: same shape as workspace_allows_member_invites/removal — does this
-- workspace's 'collaborationSettings' value let regular members edit the
-- non-collaboration settings (name/color, map default)? The collaboration
-- section itself and deleting the workspace stay owner-only regardless.
create or replace function stuffbox.workspace_allows_member_edit_settings(p_workspace_id text)
returns boolean as $$
  select coalesce(
    (
      select (value->>'allowMemberEditSettings')::boolean
      from stuffbox.workspace_settings
      where workspace_id = p_workspace_id and key = 'collaborationSettings'
    ),
    false
  );
$$ language sql security definer stable;

-- workspaces: only the owner or (when allowed) a regular member may persist
-- an update — select stays open to any member so the fields can still be
-- shown, just disabled client-side when this isn't the owner and the
-- setting is off.
drop policy if exists "workspaces: member update" on stuffbox.workspaces;

create policy "workspaces: owner or allowed member update"
  on stuffbox.workspaces for update
  using (stuffbox.is_workspace_member(id, auth.uid()))
  with check (
    owner_id = auth.uid()
    or (
      stuffbox.is_workspace_member(id, auth.uid())
      and stuffbox.workspace_allows_member_edit_settings(id)
    )
  );

-- workspace_settings: same gating for every key except 'collaborationSettings'
-- (already owner-only via its own dedicated policies below/above).
drop policy if exists "workspace_settings: member write other keys" on stuffbox.workspace_settings;
drop policy if exists "workspace_settings: member update other keys" on stuffbox.workspace_settings;

create policy "workspace_settings: owner or allowed member write other keys"
  on stuffbox.workspace_settings for insert
  with check (
    key <> 'collaborationSettings'
    and (
      exists (
        select 1 from stuffbox.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
      or (
        stuffbox.is_workspace_member(workspace_id, auth.uid())
        and stuffbox.workspace_allows_member_edit_settings(workspace_id)
      )
    )
  );

create policy "workspace_settings: owner or allowed member update other keys"
  on stuffbox.workspace_settings for update
  using (
    stuffbox.is_workspace_member(workspace_id, auth.uid())
    and key <> 'collaborationSettings'
  )
  with check (
    key <> 'collaborationSettings'
    and (
      exists (
        select 1 from stuffbox.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
      or (
        stuffbox.is_workspace_member(workspace_id, auth.uid())
        and stuffbox.workspace_allows_member_edit_settings(workspace_id)
      )
    )
  );
