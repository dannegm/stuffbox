import { supabase } from '@/services/supabase';

export const workspacesQuery = (opts = {}) => ({
    queryKey: ['workspaces'],
    queryFn: async () => {
        const { data, error } = await supabase().from('workspaces').select('*').order('created_at');
        if (error) throw error;
        return data;
    },
    ...opts,
});
