import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';
import { duplicateItem } from '@/services/duplicate-item';

export const itemsAtLocationQuery = (locationId, opts = {}) => ({
    queryKey: ['items', 'by-location', locationId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('items')
            .select(
                'id, name, quantity, icon, active_move_id, item_photos(r2_key, order, crop_x, crop_y, zoom, rotation, flip_x, flip_y), item_tags(tags(id, icon, name))',
            )
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
        sku = null,
        purchasePrice = null,
        sentimentalValue = null,
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
                sku,
                purchase_price: purchasePrice,
                sentimental_value: sentimentalValue,
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
        sku = null,
        purchasePrice = null,
        sentimentalValue = null,
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
                sku,
                purchase_price: purchasePrice,
                sentimental_value: sentimentalValue,
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

// Pack = set active_move_id, location_id untouched (§6) — the item still
// "lives" where it is, just flagged as part of the move.
export const packItemMutation = (opts = {}) => ({
    mutationFn: async ({ id, moveId }) => {
        const { data, error } = await supabase()
            .from('items')
            .update({ active_move_id: moveId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Unpack = set location_id to the destination + clear active_move_id (§6).
export const unpackItemMutation = (opts = {}) => ({
    mutationFn: async ({ id, locationId }) => {
        const { data, error } = await supabase()
            .from('items')
            .update({ location_id: locationId, active_move_id: null })
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

// "Duplicar item" — orchestration (DB inserts + R2 re-uploads for photos)
// lives in the service (src/services/duplicate-item.js); this is just the
// query-factory wrapper so callers use it the same way as every other
// mutation here.
export const duplicateItemMutation = (opts = {}) => ({
    mutationFn: duplicateItem,
    ...opts,
});

// "Promote an item to a location" — one atomic RPC (see convert_item_to_location
// in db.sql) rather than three separate client round-trips, so the item is
// never lost between an insert failing and the delete that would follow it.
export const convertItemToLocationMutation = (opts = {}) => ({
    mutationFn: async ({ itemId, locationId, type, isContainer }) => {
        const { data, error } = await supabase().rpc('convert_item_to_location', {
            p_item_id: itemId,
            p_location_id: locationId,
            p_type: type,
            p_is_container: isContainer,
        });
        if (error) throw error;
        return data;
    },
    ...opts,
});
