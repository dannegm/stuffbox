import { supabase } from '@/services/supabase';

// shouldCreateUser: true means the same call handles both signup and login —
// Supabase creates the user on first use, no separate "does this email
// exist" branch needed client-side (and no way to safely check that anyway).
export const sendLoginCode = email =>
    supabase().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
    });

export const verifyLoginCode = (email, token) =>
    supabase().auth.verifyOtp({ email, token, type: 'email' });

// Read-only — lets the register/invite email step recognize an existing
// account and reflect its saved name/gender/avatar/color on the identity
// tag before the code is even sent, instead of showing a freshly generated
// placeholder for someone who already has a profile. Never writes anything;
// see stuffbox.get_profile_identity_by_email (migrations/019).
export const getProfileIdentityByEmail = async email => {
    const { data, error } = await supabase().rpc('get_profile_identity_by_email', {
        p_email: email,
    });
    if (error) throw error;

    const row = data?.[0];
    if (!row) return null;

    return { name: row.name, gender: row.gender, avatarSeed: row.avatar_seed, color: row.color };
};
