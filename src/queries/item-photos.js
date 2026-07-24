import { supabase } from '@/services/supabase';

export const itemPhotosQuery = (itemId, opts = {}) => ({
    queryKey: ['item-photos', itemId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('item_photos')
            .select('*')
            .eq('item_id', itemId)
            .order('order');
        if (error) throw error;
        return data;
    },
    enabled: !!itemId,
    ...opts,
});

export const createItemPhotosMutation = (opts = {}) => ({
    mutationFn: async ({ itemId, photos }) => {
        const { data, error } = await supabase()
            .from('item_photos')
            .insert(
                photos.map((photo, index) => ({
                    item_id: itemId,
                    r2_key: photo.r2Key,
                    order: photo.order ?? index,
                    // Carries over crop_x/crop_y/zoom/rotation/flip_x/flip_y
                    // set on a pending (not yet persisted) photo before the
                    // item existed — omitted entirely when unset so the
                    // column defaults (0/0/1/0/false/false) apply.
                    ...(photo.crop_x !== undefined && { crop_x: photo.crop_x }),
                    ...(photo.crop_y !== undefined && { crop_y: photo.crop_y }),
                    ...(photo.zoom !== undefined && { zoom: photo.zoom }),
                    ...(photo.rotation !== undefined && { rotation: photo.rotation }),
                    ...(photo.flip_x !== undefined && { flip_x: photo.flip_x }),
                    ...(photo.flip_y !== undefined && { flip_y: photo.flip_y }),
                })),
            )
            .select();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const deleteItemPhotoMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('item_photos').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

// One update call per photo, not a single bulk statement — each row gets a
// different `order` value, unlike bulk.js's shared-value-across-many-ids
// updates.
export const reorderItemPhotosMutation = (opts = {}) => ({
    mutationFn: async photos => {
        await Promise.all(
            photos.map(async ({ id, order }) => {
                const { error } = await supabase()
                    .from('item_photos')
                    .update({ order })
                    .eq('id', id);
                if (error) throw error;
            }),
        );
    },
    ...opts,
});

export const updateItemPhotoCropMutation = (opts = {}) => ({
    mutationFn: async ({ id, crop_x, crop_y, zoom, rotation, flip_x, flip_y }) => {
        const { data, error } = await supabase()
            .from('item_photos')
            .update({ crop_x, crop_y, zoom, rotation, flip_x, flip_y })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
