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
