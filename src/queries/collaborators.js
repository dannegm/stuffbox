import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';

export const workspaceMembersQuery = (workspaceId, opts = {}) => ({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('workspace_members')
            .select('user_id, joined_at, profiles(uuid, name, email, avatar_seed, gender, color)')
            .eq('workspace_id', workspaceId)
            .order('joined_at');
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});

export const workspaceInvitesQuery = (workspaceId, opts = {}) => ({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('workspace_invites')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});

// token is a long, unguessable nanoid — unlike the entity nanoid(8) ids
// (short is fine there, everything sits behind auth + RLS), an invite link
// is meant to work for someone with no session yet, so its own length is
// the only thing standing between "found the link" and "joined the space".
export const createWorkspaceInviteMutation = (opts = {}) => ({
    mutationFn: async ({ workspaceId, invitedBy, maxUses = 1, expiresAt }) => {
        const { data, error } = await supabase()
            .from('workspace_invites')
            .insert({
                token: nanoid(32),
                workspace_id: workspaceId,
                invited_by: invitedBy,
                max_uses: maxUses,
                ...(expiresAt ? { expires_at: expiresAt } : {}),
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const deleteWorkspaceInviteMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('workspace_invites').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

// Covers both "owner removes a member" and "member leaves" — RLS (db.sql)
// allows delete when the row is the caller's own membership OR the caller
// owns the workspace; no separate mutation needed for each case.
export const removeWorkspaceMemberMutation = (opts = {}) => ({
    mutationFn: async ({ workspaceId, userId }) => {
        const { error } = await supabase()
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId);
        if (error) throw error;
        return userId;
    },
    ...opts,
});
