import { supabase } from '@/services/supabase';

// Generic app-level key/value store (stuffbox-plan.md's 5-level settings
// cascade: env < app < workspace < user < localStorage) — RLS lets any
// authenticated user select, but only admins write (db.sql). `.maybeSingle()`
// since an unset key is a normal, expected state, not an error.
export const SUGGESTED_ICONS_KEY = 'suggested_icons';

export const appSettingQuery = (key, opts = {}) => ({
    queryKey: ['app-setting', key],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .maybeSingle();
        if (error) throw error;
        return data?.value ?? null;
    },
    ...opts,
});

export const setAppSettingMutation = (opts = {}) => ({
    mutationFn: async ({ key, value }) => {
        const { data, error } = await supabase()
            .from('app_settings')
            .upsert({ key, value }, { onConflict: 'key' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
