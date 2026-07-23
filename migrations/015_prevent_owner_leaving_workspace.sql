-- Migration 015 — Prevent a workspace owner from being removed, and restrict workspace deletion to the owner
-- Run in Supabase SQL Editor

-- workspace_members: no clause (self-leave, owner-removes-anyone, or an
-- allowed member removing someone) may ever target the workspace owner's own
-- row — an owner can only leave by deleting the whole workspace, never by
-- deleting their own membership.
drop policy if exists "workspace_members: owner, self, or allowed member delete" on stuffbox.workspace_members;

create policy "workspace_members: owner, self, or allowed member delete"
  on stuffbox.workspace_members for delete
  using (
    not exists (
      select 1 from stuffbox.workspaces w
      where w.id = workspace_id and w.owner_id = workspace_members.user_id
    )
    and (
      user_id = auth.uid()
      or exists (
        select 1 from stuffbox.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
      or (
        stuffbox.workspace_allows_member_removal(workspace_id)
        and stuffbox.is_workspace_member(workspace_id, auth.uid())
      )
    )
  );

-- workspaces: split the old blanket "member access" (for all) — select/
-- insert/update stay exactly as before, but deleting the entire workspace
-- (cascades to everything it contains) becomes owner-only.
drop policy if exists "workspaces: member access" on stuffbox.workspaces;

create policy "workspaces: member select"
  on stuffbox.workspaces for select
  using (stuffbox.is_workspace_member(id, auth.uid()));

create policy "workspaces: member insert"
  on stuffbox.workspaces for insert
  with check (owner_id = auth.uid() or stuffbox.is_workspace_member(id, auth.uid()));

create policy "workspaces: member update"
  on stuffbox.workspaces for update
  using (stuffbox.is_workspace_member(id, auth.uid()))
  with check (owner_id = auth.uid() or stuffbox.is_workspace_member(id, auth.uid()));

create policy "workspaces: owner delete"
  on stuffbox.workspaces for delete
  using (owner_id = auth.uid());
