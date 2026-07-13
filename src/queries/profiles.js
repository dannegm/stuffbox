import { supabase } from '@/services/supabase';

export const profileQuery = (userId, opts = {}) => ({
    queryKey: ['profile', userId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('profiles')
            .select('*')
            .eq('uuid', userId)
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
