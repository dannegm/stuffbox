import { supabase } from '@/services/supabase';

export const locationPhotosQuery = (locationId, opts = {}) => ({
    queryKey: ['location-photos', locationId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('location_photos')
            .select('*')
            .eq('location_id', locationId)
            .order('order');
        if (error) throw error;
        return data;
    },
    enabled: !!locationId,
    ...opts,
});

export const createLocationPhotosMutation = (opts = {}) => ({
    mutationFn: async ({ locationId, photos }) => {
        const { data, error } = await supabase()
            .from('location_photos')
            .insert(
                photos.map((photo, index) => ({
                    location_id: locationId,
                    r2_key: photo.r2Key,
                    order: photo.order ?? index,
                })),
            )
            .select();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const deleteLocationPhotoMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('location_photos').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

// One update call per photo, not a single bulk statement — each row gets a
// different `order` value, unlike bulk.js's shared-value-across-many-ids
// updates.
export const reorderLocationPhotosMutation = (opts = {}) => ({
    mutationFn: async photos => {
        await Promise.all(
            photos.map(async ({ id, order }) => {
                const { error } = await supabase()
                    .from('location_photos')
                    .update({ order })
                    .eq('id', id);
                if (error) throw error;
            }),
        );
    },
    ...opts,
});

export const updateLocationPhotoCropMutation = (opts = {}) => ({
    mutationFn: async ({ id, crop_x, crop_y, zoom, rotation, flip_x, flip_y }) => {
        const { data, error } = await supabase()
            .from('location_photos')
            .update({ crop_x, crop_y, zoom, rotation, flip_x, flip_y })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
