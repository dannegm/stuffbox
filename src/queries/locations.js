import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';

export const locationQuery = (id, opts = {}) => ({
    queryKey: ['location', id],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('locations')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Root locations (houses) when parentId is null, otherwise a location's
// direct children — same shape either way, just a different `parent_id`.
export const locationChildrenQuery = ({ workspaceId, parentId = null }, opts = {}) => ({
    queryKey: ['locations', workspaceId, parentId],
    queryFn: async () => {
        let query = supabase()
            .from('locations')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('name');
        query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Walks parent_id up to the root, one round-trip per level — trees are
// shallow in practice (house > room > shelf > box), so this beats adding a
// recursive-CTE RPC just for a breadcrumb.
export const locationAncestorsQuery = (parentId, opts = {}) => ({
    queryKey: ['location-ancestors', parentId],
    queryFn: async () => {
        const ancestors = [];
        let currentId = parentId;
        while (currentId) {
            const { data, error } = await supabase()
                .from('locations')
                .select('id, name, type, parent_id')
                .eq('id', currentId)
                .single();
            if (error) throw error;
            ancestors.unshift(data);
            currentId = data.parent_id;
        }
        return ancestors;
    },
    enabled: !!parentId,
    ...opts,
});

export const createLocationMutation = (opts = {}) => ({
    mutationFn: async ({
        workspaceId,
        parentId = null,
        name,
        type,
        icon = null,
        lat = null,
        lng = null,
    }) => {
        const { data, error } = await supabase()
            .from('locations')
            .insert({
                id: nanoid(8),
                workspace_id: workspaceId,
                parent_id: parentId,
                name,
                type,
                icon,
                lat,
                lng,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
