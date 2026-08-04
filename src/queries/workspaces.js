import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';
import { seedWorkspaceOptionLists } from '@/services/provision-account';

export const workspacesQuery = (opts = {}) => ({
    queryKey: ['workspaces'],
    queryFn: async () => {
        const { data, error } = await supabase().from('workspaces').select('*').order('created_at');
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Same batched-counts shape as locationCountsQuery — one round trip for every
// workspace in the list rather than N per-workspace queries, for the
// overview cards (ubicaciones + colaboradores per workspace).
export const workspaceStatsQuery = (workspaceIds = [], opts = {}) => ({
    queryKey: ['workspace-stats', workspaceIds],
    queryFn: async () => {
        const [membersRes, locationsRes] = await Promise.all([
            supabase().from('workspace_members').select('workspace_id').in('workspace_id', workspaceIds),
            supabase()
                .from('locations')
                .select('workspace_id')
                .in('workspace_id', workspaceIds)
                .is('parent_id', null),
        ]);
        if (membersRes.error) throw membersRes.error;
        if (locationsRes.error) throw locationsRes.error;

        const stats = Object.fromEntries(
            workspaceIds.map(id => [id, { members: 0, locations: 0 }]),
        );
        for (const row of membersRes.data) stats[row.workspace_id].members += 1;
        for (const row of locationsRes.data) stats[row.workspace_id].locations += 1;
        return stats;
    },
    enabled: workspaceIds.length > 0,
    ...opts,
});

export const workspaceQuery = (id, opts = {}) => ({
    queryKey: ['workspace', id],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('workspaces')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Three-step sequence (workspace insert -> self-join workspace_members ->
// seed option_lists) — the only way a workspace ever comes into existence,
// always from an explicit user action (this mutation, or claim_workspace_
// invite via an invite link). Nothing auto-creates one on signup/login.
export const createWorkspaceMutation = (opts = {}) => ({
    mutationFn: async ({ name, userId }) => {
        const client = supabase();
        const id = nanoid(8);

        const { data, error } = await client
            .from('workspaces')
            .insert({ id, name, owner_id: userId })
            .select()
            .single();
        if (error) throw error;

        const { error: memberError } = await client
            .from('workspace_members')
            .insert({ workspace_id: id, user_id: userId });
        if (memberError) throw memberError;

        await seedWorkspaceOptionLists(client, id);

        return data;
    },
    ...opts,
});

export const updateWorkspaceMutation = (opts = {}) => ({
    mutationFn: async ({ id, name, color }) => {
        const { data, error } = await supabase()
            .from('workspaces')
            .update({ name, color })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Admin-only in practice — regular owners have no delete UI for their own
// workspace yet (deferred), this is reachable only from /admin/workspaces,
// which the RLS "admin full access" policy on every table already permits.
// Cascades to everything hanging off workspace_id (locations, items, moves,
// tags, ...) per db.sql's `on delete cascade`.
export const deleteWorkspaceMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('workspaces').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});
