import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';
import { isContainerType } from '@/helpers/location';

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
            .select('*, location_photos(r2_key, order, crop_x, crop_y, zoom, rotation, flip_x, flip_y)')
            .eq('workspace_id', workspaceId)
            .order('name');
        query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Direct (non-recursive) child-location and item counts for a batch of
// locations — used by LocationListItem's summary line. A separate query
// from locationChildrenQuery so the other consumers of that one (HousesNav,
// LocationPicker, RootLocationSelect) don't pay for counts they never show.
export const locationCountsQuery = (locationIds = [], opts = {}) => ({
    queryKey: ['location-counts', locationIds],
    queryFn: async () => {
        const [childLocationsRes, itemsRes] = await Promise.all([
            supabase().from('locations').select('parent_id').in('parent_id', locationIds),
            supabase().from('items').select('location_id').in('location_id', locationIds),
        ]);
        if (childLocationsRes.error) throw childLocationsRes.error;
        if (itemsRes.error) throw itemsRes.error;

        const counts = Object.fromEntries(locationIds.map(id => [id, { locations: 0, items: 0 }]));
        for (const row of childLocationsRes.data) counts[row.parent_id].locations += 1;
        for (const row of itemsRes.data) counts[row.location_id].items += 1;
        return counts;
    },
    enabled: locationIds.length > 0,
    ...opts,
});

// Every descendant id (any depth) of a location — used to block picking a
// destination inside your own subtree when transferring/unpacking, which
// would otherwise create a parent_id cycle (infinite loop for ancestor
// walks and the price RPC's recursive CTE).
export const getLocationDescendantIds = async locationId => {
    const descendants = [];
    let frontier = [locationId];
    while (frontier.length > 0) {
        const { data, error } = await supabase()
            .from('locations')
            .select('id')
            .in('parent_id', frontier);
        if (error) throw error;
        frontier = data.map(row => row.id);
        descendants.push(...frontier);
    }
    return descendants;
};

// Reactive wrapper around getLocationDescendantIds — the deck's location
// filter needs this as a query (refetch when the filter changes), unlike the
// imperative pack/transfer callers of the plain function above.
export const locationDescendantIdsQuery = (locationId, opts = {}) => ({
    queryKey: ['location-descendant-ids', locationId],
    queryFn: () => getLocationDescendantIds(locationId),
    enabled: !!locationId,
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
                .select('id, name, type, icon, parent_id')
                .eq('id', currentId)
                .maybeSingle();
            if (error) throw error;
            // No row back (deleted mid-walk, or RLS no longer grants access to
            // it) — stop here instead of crashing on a missing `parent_id`.
            if (!data) break;
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
        isItem = false,
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
                is_container: isContainerType(type),
                is_item: isItem,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const updateLocationMutation = (opts = {}) => ({
    mutationFn: async ({
        id,
        name,
        type,
        icon = null,
        description = null,
        isFragile = false,
        storageOrientation = null,
        sentimentalValue = null,
        isItem = false,
        lat,
        lng,
    }) => {
        const { data, error } = await supabase()
            .from('locations')
            .update({
                name,
                type,
                icon,
                is_container: isContainerType(type),
                description,
                is_fragile: isFragile,
                storage_orientation: storageOrientation,
                sentimental_value: sentimentalValue,
                is_item: isItem,
                // Only root locations get a map picker in the edit dialog —
                // omitted (rather than defaulted to null) elsewhere so
                // editing a room/box never clobbers coordinates it never had.
                ...(lat !== undefined && { lat }),
                ...(lng !== undefined && { lng }),
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const locationTotalPriceQuery = (locationId, opts = {}) => ({
    queryKey: ['location-total-price', locationId],
    queryFn: async () => {
        const { data, error } = await supabase().rpc('location_total_price', {
            p_location_id: locationId,
        });
        if (error) throw error;
        return data;
    },
    enabled: !!locationId,
    ...opts,
});

// One of the three pack/unpack/transfer operations from the plan (§6) —
// transfer = set parent_id, leave active_move_id untouched. Available on any
// location (not just containers) — a room can move to a different house too.
export const transferLocationMutation = (opts = {}) => ({
    mutationFn: async ({ id, parentId }) => {
        const { data, error } = await supabase()
            .from('locations')
            .update({ parent_id: parentId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Pack a box = set active_move_id, parent_id untouched (§6) — same shape as
// packItemMutation, just this table's position column is parent_id not
// location_id.
export const packLocationMutation = (opts = {}) => ({
    mutationFn: async ({ id, moveId }) => {
        const { data, error } = await supabase()
            .from('locations')
            .update({ active_move_id: moveId })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Unpack a box = set parent_id to the destination + clear active_move_id.
export const unpackLocationMutation = (opts = {}) => ({
    mutationFn: async ({ id, parentId }) => {
        const { data, error } = await supabase()
            .from('locations')
            .update({ parent_id: parentId, active_move_id: null })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Cascades to every descendant location and item (db.sql: parent_id/location_id
// both `on delete cascade`) — the caller is responsible for warning about that.
export const deleteLocationMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('locations').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});
