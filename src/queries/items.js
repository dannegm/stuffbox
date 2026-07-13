import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';

export const itemsAtLocationQuery = (locationId, opts = {}) => ({
    queryKey: ['items', 'by-location', locationId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('items')
            .select('id, name, quantity, icon')
            .eq('location_id', locationId)
            .order('name');
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const itemQuery = (id, opts = {}) => ({
    queryKey: ['item', id],
    queryFn: async () => {
        const { data, error } = await supabase().from('items').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const createItemMutation = (opts = {}) => ({
    mutationFn: async ({
        workspaceId,
        locationId,
        name,
        description = null,
        quantity = 1,
        condition = null,
        storageOrientation = null,
        isFragile = false,
        icon = null,
    }) => {
        const { data, error } = await supabase()
            .from('items')
            .insert({
                id: nanoid(8),
                workspace_id: workspaceId,
                location_id: locationId,
                name,
                description,
                quantity,
                condition,
                storage_orientation: storageOrientation,
                is_fragile: isFragile,
                icon,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const updateItemMutation = (opts = {}) => ({
    mutationFn: async ({
        id,
        name,
        description = null,
        quantity = 1,
        condition = null,
        storageOrientation = null,
        isFragile = false,
        icon = null,
    }) => {
        const { data, error } = await supabase()
            .from('items')
            .update({
                name,
                description,
                quantity,
                condition,
                storage_orientation: storageOrientation,
                is_fragile: isFragile,
                icon,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// One of the three pack/unpack/transfer operations from the plan (§6) —
// transfer = set location_id, leave active_move_id untouched.
export const transferItemMutation = (opts = {}) => ({
    mutationFn: async ({ id, locationId }) => {
        const { data, error } = await supabase()
            .from('items')
            .update({ location_id: locationId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const deleteItemMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('items').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});
