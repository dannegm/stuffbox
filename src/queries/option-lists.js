import { supabase } from '@/services/supabase';

// field: 'condition' | 'orientation' — workspace-scoped, seeded on
// provisioning (src/services/provision-account.js), editable later from
// Settings (not built yet).
export const optionListsQuery = (workspaceId, field, opts = {}) => ({
    queryKey: ['option-lists', workspaceId, field],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('option_lists')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('field', field)
            .order('sort_order');
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});
