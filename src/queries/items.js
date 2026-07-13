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
