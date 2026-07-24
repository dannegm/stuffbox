import { supabase } from '@/services/supabase';

// Every like/dislike in a workspace, profile joined — the one source of
// truth for the deck's per-entity avatar corners, the item list/detail
// counts, and the "already rated" dialog, so all four agree on the same data.
export const entityRatingsQuery = (workspaceId, opts = {}) => ({
    queryKey: ['entity-ratings', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('entity_ratings')
            .select('*, profiles(uuid, name, avatar_seed, gender, color)')
            .eq('workspace_id', workspaceId);
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});

// Ratings for a single entity, profile joined — the item/location detail
// pages' avatar stacks use this instead of entityRatingsQuery (which loads
// the whole workspace, sized for the deck, not a single row's page).
export const entityRatingsForEntityQuery = (entityType, entityId, opts = {}) => ({
    queryKey: ['entity-ratings', 'entity', entityType, entityId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('entity_ratings')
            .select('*, profiles(uuid, name, avatar_seed, gender, color)')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId);
        if (error) throw error;
        return data;
    },
    enabled: !!entityId,
    ...opts,
});

// Combined candidate pool for the swipe deck — items and is_item locations
// share the same card shape (name, photos, sentimental_value; condition only
// exists on items). Fetched together here rather than reusing
// itemsAtLocationQuery/locationChildrenQuery, which are always scoped to one
// location — the deck needs every eligible entity across the whole workspace.
export const deckQueueQuery = (workspaceId, opts = {}) => ({
    queryKey: ['deck-queue', workspaceId],
    queryFn: async () => {
        const [itemsRes, locationsRes] = await Promise.all([
            supabase()
                .from('items')
                .select(
                    'id, name, icon, sentimental_value, condition, item_photos(r2_key, order, crop_x, crop_y, zoom), item_tags(tags(id, name, icon, color))',
                )
                .eq('workspace_id', workspaceId),
            supabase()
                .from('locations')
                .select(
                    'id, name, icon, sentimental_value, location_photos(r2_key, order, crop_x, crop_y, zoom)',
                )
                .eq('workspace_id', workspaceId)
                .eq('is_item', true),
        ]);
        if (itemsRes.error) throw itemsRes.error;
        if (locationsRes.error) throw locationsRes.error;

        const items = itemsRes.data.map(item => ({
            ...item,
            entityType: 'item',
            entityId: item.id,
        }));
        const locations = locationsRes.data.map(location => ({
            ...location,
            entityType: 'location',
            entityId: location.id,
            condition: null,
        }));
        return [...items, ...locations];
    },
    enabled: !!workspaceId,
    ...opts,
});

// Upsert, not insert — a re-swipe on something the caller already rated
// changes their existing vote (db.sql's unique(entity_type, entity_id,
// profile_id)) instead of erroring on the conflict.
export const rateEntityMutation = (opts = {}) => ({
    mutationFn: async ({ workspaceId, entityType, entityId, profileId, liked }) => {
        const { data, error } = await supabase()
            .from('entity_ratings')
            .upsert(
                {
                    workspace_id: workspaceId,
                    entity_type: entityType,
                    entity_id: entityId,
                    profile_id: profileId,
                    liked,
                },
                { onConflict: 'entity_type,entity_id,profile_id' },
            )
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Removes a vote entirely (the "already rated" dialog's undo action) — not
// the same as rateEntityMutation, which changes a vote but always leaves one.
export const deleteEntityRatingMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('entity_ratings').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

// The "already rated" dialog's danger-zone action — wipes every vote *this
// user* cast in the workspace (not other members'), so the deck queue treats
// everything as unrated again.
export const deleteAllEntityRatingsMutation = (opts = {}) => ({
    mutationFn: async ({ workspaceId, profileId }) => {
        const { error } = await supabase()
            .from('entity_ratings')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('profile_id', profileId);
        if (error) throw error;
    },
    ...opts,
});
