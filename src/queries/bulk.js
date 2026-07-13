import { supabase } from '@/services/supabase';

// Pack/unpack/transfer are one DB write (stuffbox-plan.md §6); bulk is the
// same thing over an array of ids, split across the two tables a selection
// can span (loose items vs boxes) — each table gets at most one update call.

export const bulkTransferMutation = (opts = {}) => ({
    mutationFn: async ({ itemIds = [], locationIds = [], destinationId }) => {
        if (itemIds.length > 0) {
            const { error } = await supabase()
                .from('items')
                .update({ location_id: destinationId })
                .in('id', itemIds);
            if (error) throw error;
        }
        if (locationIds.length > 0) {
            const { error } = await supabase()
                .from('locations')
                .update({ parent_id: destinationId })
                .in('id', locationIds);
            if (error) throw error;
        }
    },
    ...opts,
});

export const bulkPackMutation = (opts = {}) => ({
    mutationFn: async ({ itemIds = [], locationIds = [], moveId }) => {
        if (itemIds.length > 0) {
            const { error } = await supabase()
                .from('items')
                .update({ active_move_id: moveId })
                .in('id', itemIds);
            if (error) throw error;
        }
        if (locationIds.length > 0) {
            const { error } = await supabase()
                .from('locations')
                .update({ active_move_id: moveId })
                .in('id', locationIds);
            if (error) throw error;
        }
    },
    ...opts,
});

export const bulkUnpackMutation = (opts = {}) => ({
    mutationFn: async ({ itemIds = [], locationIds = [], destinationId }) => {
        if (itemIds.length > 0) {
            const { error } = await supabase()
                .from('items')
                .update({ location_id: destinationId, active_move_id: null })
                .in('id', itemIds);
            if (error) throw error;
        }
        if (locationIds.length > 0) {
            const { error } = await supabase()
                .from('locations')
                .update({ parent_id: destinationId, active_move_id: null })
                .in('id', locationIds);
            if (error) throw error;
        }
    },
    ...opts,
});
