import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';

export const movesQuery = (workspaceId, opts = {}) => ({
    queryKey: ['moves', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('moves')
            .select('*, origin:origin_location_id(name), destination:destination_location_id(name)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});

export const moveQuery = (id, opts = {}) => ({
    queryKey: ['move', id],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('moves')
            .select('*, origin:origin_location_id(*), destination:destination_location_id(*)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    enabled: !!id,
    ...opts,
});

export const createMoveMutation = (opts = {}) => ({
    mutationFn: async ({
        workspaceId,
        name,
        originLocationId,
        destinationLocationId,
        routeType,
    }) => {
        const { data, error } = await supabase()
            .from('moves')
            .insert({
                id: nanoid(8),
                workspace_id: workspaceId,
                name,
                origin_location_id: originLocationId,
                destination_location_id: destinationLocationId,
                route_type: routeType,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const updateMoveMutation = (opts = {}) => ({
    mutationFn: async ({ id, name, status, routeType }) => {
        // Same shape as moveQuery (origin/destination embedded, not just their
        // ids) — the caller replaces the cached move with this result, and a
        // narrower select would wipe out origin/destination, breaking hasRoute.
        const { data, error } = await supabase()
            .from('moves')
            .update({ name, status, route_type: routeType })
            .eq('id', id)
            .select('*, origin:origin_location_id(*), destination:destination_location_id(*)')
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// items/locations with active_move_id = this move fall back to null (their
// fk is on delete set null) — nothing else to clean up here.
export const deleteMoveMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('moves').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

// Everything currently packed into a move — loose items and boxes (locations)
// are separate tables/shapes, so this is two queries under one key.
export const packedInMoveQuery = (moveId, opts = {}) => ({
    queryKey: ['move-packed', moveId],
    queryFn: async () => {
        const [itemsRes, locationsRes] = await Promise.all([
            supabase()
                .from('items')
                .select('id, name, quantity, icon, is_fragile')
                .eq('active_move_id', moveId)
                .order('name'),
            supabase()
                .from('locations')
                .select('id, name, type, icon, parent_id, is_fragile, ai_summary')
                .eq('active_move_id', moveId)
                .order('name'),
        ]);
        if (itemsRes.error) throw itemsRes.error;
        if (locationsRes.error) throw locationsRes.error;
        return { items: itemsRes.data, locations: locationsRes.data };
    },
    enabled: !!moveId,
    ...opts,
});
