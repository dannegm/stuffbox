'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { ensureAccountProvisioned } from '@/services/provision-account';

const AuthContext = createContext({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// onAuthStateChange fires INITIAL_SESSION first (restored from cookies or
// null), then SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED as they happen — one
// listener covers both the initial load and every later transition.
// Provisioning must run here (not only after signUp()) because a session
// only exists once the user is actually authenticated — with email
// confirmation on, that's after they confirm and log in, not at signup time.
export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const client = supabase();

        const {
            data: { subscription },
        } = client.auth.onAuthStateChange((event, nextSession) => {
            setSession(nextSession);
            setIsLoading(false);
            if (nextSession?.user) {
                ensureAccountProvisioned(client, nextSession.user);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = () => supabase().auth.signOut();

    return (
        <AuthContext.Provider value={{ user: session?.user ?? null, session, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
