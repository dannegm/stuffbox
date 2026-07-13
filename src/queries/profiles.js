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

export const updateProfileMutation = (opts = {}) => ({
    mutationFn: async ({ id, name, gender, avatarSeed, color }) => {
        const { data, error } = await supabase()
            .from('profiles')
            .update({ name, gender, avatar_seed: avatarSeed, color })
            .eq('uuid', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Admin-only in practice (/admin/users) — a regular user's own "owner can
// update" RLS policy explicitly blocks setting is_super_admin (db.sql: `with
// check (... and is_super_admin = false)`), so this only works when the
// caller already satisfies requesting_user_is_admin().
export const setSuperAdminMutation = (opts = {}) => ({
    mutationFn: async ({ id, isSuperAdmin }) => {
        const { data, error } = await supabase()
            .from('profiles')
            .update({ is_super_admin: isSuperAdmin })
            .eq('uuid', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});
