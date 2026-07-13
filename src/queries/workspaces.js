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

// Same three-step sequence as ensureAccountProvisioned's first workspace
// (workspace insert -> self-join workspace_members -> seed option_lists),
// just user-triggered instead of automatic.
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
