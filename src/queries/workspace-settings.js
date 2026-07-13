import { supabase } from '@/services/supabase';

// Generic per-workspace key/value store (stuffbox-plan.md's 5-level settings
// cascade: env < app < workspace < user < localStorage) — only the
// `mapDefaultViewport` key is actually read/written today (see
// LocationMapPicker), not a full cascade resolver. `.maybeSingle()` since an
// unset key is a normal, expected state, not an error.
export const workspaceSettingQuery = (workspaceId, key, opts = {}) => ({
    queryKey: ['workspace-setting', workspaceId, key],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('workspace_settings')
            .select('value')
            .eq('workspace_id', workspaceId)
            .eq('key', key)
            .maybeSingle();
        if (error) throw error;
        return data?.value ?? null;
    },
    enabled: !!workspaceId,
    ...opts,
});

export const setWorkspaceSettingMutation = (opts = {}) => ({
    mutationFn: async ({ workspaceId, key, value }) => {
        const { data, error } = await supabase()
            .from('workspace_settings')
            .upsert({ workspace_id: workspaceId, key, value }, { onConflict: 'workspace_id,key' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
