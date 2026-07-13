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
