import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery } from '@/queries/profiles';

// is_super_admin gates the /admin panel — reusing profileQuery (already
// select('*')) instead of a bespoke query, per bins' useAdmin() shape.
export const useIsAdmin = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { data: profile, isPending } = useQuery(profileQuery(user?.id, { enabled: !!user }));
    return {
        isAdmin: !!profile?.is_super_admin,
        isLoading: isAuthLoading || (!!user && isPending),
    };
};
