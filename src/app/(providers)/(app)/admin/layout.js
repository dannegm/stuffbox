'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ShieldCheckIcon,
    HouseIcon,
    UsersIcon,
    GearIcon,
    TagIcon,
    SparkleIcon,
    ArrowLeftIcon,
} from '@phosphor-icons/react/ssr';
import { useIsAdmin } from '@/hooks/use-admin';
import { supabase } from '@/services/supabase';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
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
            'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
    >
        <Icon className='size-4' />
        {label}
        {count != null && (
            <span
                className={cn(
                    'rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
            >
                {count}
            </span>
        )}
    </Link>
);

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='AdminLoading'>
        <Skeleton className='h-32 w-full rounded-2xl' />
        <div className='flex gap-1'>
            <Skeleton className='h-8 w-28 rounded-lg' />
            <Skeleton className='h-8 w-24 rounded-lg' />
            <Skeleton className='h-8 w-24 rounded-lg' />
        </div>
        <Skeleton className='h-48 w-full rounded-lg' />
    </div>
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

    if (isLoading || !isAdmin) return <Loading />;

    return (
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='AdminLayout'>
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='AdminHero'
            >
                <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5'>
                            <ShieldCheckIcon weight='fill' />
                        </span>
                        <div className='min-w-0'>
                            <h1 className='font-heading text-xl font-semibold tracking-tight sm:text-2xl'>
                                Admin
                            </h1>
                            <p className='truncate text-xs text-muted-foreground sm:text-sm'>
                                Workspaces, usuarios y ajustes globales de stuffbox
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                        <Stat icon={HouseIcon} value={workspacesCount ?? 0} label='workspaces' />
                        <Stat icon={UsersIcon} value={usersCount ?? 0} label='usuarios' />
                    </div>
                </div>
            </div>

            <div className='flex gap-1 overflow-x-auto' data-block='AdminNav'>
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
                <NavTab
                    href='/admin/settings'
                    icon={GearIcon}
                    label='Ajustes'
                    active={pathname.startsWith('/admin/settings')}
                />
                <NavTab
                    href='/admin/labels-preview'
                    icon={TagIcon}
                    label='Etiquetas'
                    active={pathname.startsWith('/admin/labels-preview')}
                />
                <NavTab
                    href='/admin/suggested-icons'
                    icon={SparkleIcon}
                    label='Íconos sugeridos'
                    active={pathname.startsWith('/admin/suggested-icons')}
                />
            </div>

            <div className='flex-1'>{children}</div>
        </div>
    );
}
