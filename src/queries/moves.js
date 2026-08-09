import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';

// `has_items` (used by getMoveStatusDot to tell an empty planning move
// apart from one that's already got stuff packed into it) isn't a moves
// column — it's derived here from whatever items/locations currently point
// active_move_id at each move, same two-table shape as packedInMoveQuery.
export const movesQuery = (workspaceId, opts = {}) => ({
    queryKey: ['moves', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('moves')
            .select('*, origin:origin_location_id(name), destination:destination_location_id(name)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (data.length === 0) return data;

        const moveIds = data.map(move => move.id);
        const [itemsRes, locationsRes] = await Promise.all([
            supabase().from('items').select('active_move_id').in('active_move_id', moveIds),
            supabase().from('locations').select('active_move_id').in('active_move_id', moveIds),
        ]);
        if (itemsRes.error) throw itemsRes.error;
        if (locationsRes.error) throw locationsRes.error;

        const idsWithItems = new Set([
            ...itemsRes.data.map(row => row.active_move_id),
            ...locationsRes.data.map(row => row.active_move_id),
        ]);
        return data.map(move => ({ ...move, has_items: idsWithItems.has(move.id) }));
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
    mutationFn: async ({
        id,
        name,
        status,
        routeType,
        cost,
        startedAt,
        estimatedCompletionAt,
        completedAt,
        originLocationId,
        destinationLocationId,
    }) => {
        // Only provided keys are written — lets cost-only/dates-only edits
        // share this mutation without clobbering the other move fields.
        const payload = {};
        if (name !== undefined) payload.name = name;
        if (status !== undefined) payload.status = status;
        if (routeType !== undefined) payload.route_type = routeType;
        if (cost !== undefined) payload.cost = cost;
        if (startedAt !== undefined) payload.started_at = startedAt;
        if (estimatedCompletionAt !== undefined) payload.estimated_completion_at = estimatedCompletionAt;
        if (completedAt !== undefined) payload.completed_at = completedAt;
        if (originLocationId !== undefined) payload.origin_location_id = originLocationId;
        if (destinationLocationId !== undefined) payload.destination_location_id = destinationLocationId;

        // Same shape as moveQuery (origin/destination embedded, not just their
        // ids) — the caller replaces the cached move with this result, and a
        // narrower select would wipe out origin/destination, breaking hasRoute.
        const { data, error } = await supabase()
            .from('moves')
            .update(payload)
            .eq('id', id)
            .select('*, origin:origin_location_id(*), destination:destination_location_id(*)')
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const moveTotalValueQuery = (moveId, opts = {}) => ({
    queryKey: ['move-total-value', moveId],
    queryFn: async () => {
        const { data, error } = await supabase().rpc('move_total_value', { p_move_id: moveId });
        if (error) throw error;
        return data;
    },
    enabled: !!moveId,
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
                .select(
                    'id, name, description, quantity, condition, sentimental_value, icon, is_fragile, storage_orientation, item_tags(tags(id, icon, name))',
                )
                .eq('active_move_id', moveId)
                .order('name'),
            supabase()
                .from('locations')
                .select(
                    'id, name, type, icon, parent_id, is_fragile, ai_summary, storage_orientation',
                )
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
