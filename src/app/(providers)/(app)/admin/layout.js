'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheckIcon, HouseIcon, UsersIcon } from '@phosphor-icons/react/ssr';
import { useIsAdmin } from '@/hooks/use-admin';
import { supabase } from '@/services/supabase';
import { Spinner } from '@/ui/spinner';
import { cn } from '@/helpers/utils';

const useAdminCount = table => ({
    queryKey: ['admin-count', table],
    queryFn: async () => {
        const { count, error } = await supabase()
            .from(table)
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
    },
});

const NavTab = ({ href, icon: Icon, label, count, active }) => (
    <Link
        href={href}
        className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted',
            active ? 'bg-muted text-foreground' : 'text-muted-foreground',
        )}
    >
        <Icon className='size-4' />
        {label}
        {count != null && (
            <span className='rounded-md bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground'>
                {count}
            </span>
        )}
    </Link>
);

// Every table already has a "requesting_user_is_admin()" RLS policy (see
// db.sql) — the super-admin's normal client session satisfies it on its own,
// so this layout is just a gate + nav; no separate admin API, no service key.
export default function AdminLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAdmin, isLoading } = useIsAdmin();
    const { data: workspacesCount } = useQuery(useAdminCount('workspaces'));
    const { data: usersCount } = useQuery(useAdminCount('profiles'));

    useEffect(() => {
        if (!isLoading && !isAdmin) router.replace('/');
    }, [isLoading, isAdmin, router]);

    if (isLoading || !isAdmin) {
        return (
            <div className='flex flex-1 items-center justify-center' data-block='AdminLoading'>
                <Spinner className='size-6' />
            </div>
        );
    }

    return (
        <div className='flex flex-1 flex-col' data-block='AdminLayout'>
            <div className='flex flex-col gap-3 border-b p-4'>
                <div className='flex items-center gap-2'>
                    <ShieldCheckIcon className='size-4 text-primary' />
                    <span className='text-xs font-semibold tracking-widest text-muted-foreground uppercase'>
                        Admin
                    </span>
                </div>
                <div className='flex gap-1'>
                    <NavTab
                        href='/admin/workspaces'
                        icon={HouseIcon}
                        label='Workspaces'
                        count={workspacesCount}
                        active={pathname.startsWith('/admin/workspaces')}
                    />
                    <NavTab
                        href='/admin/users'
                        icon={UsersIcon}
                        label='Usuarios'
                        count={usersCount}
                        active={pathname.startsWith('/admin/users')}
                    />
                </div>
            </div>
            <div className='flex-1 p-4'>{children}</div>
        </div>
    );
}
