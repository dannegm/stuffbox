'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { WorkspacesOverview } from '@/components/workspaces/workspaces-overview';
import { Skeleton } from '@/ui/skeleton';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-2 p-4' data-block='WorkspacesPageLoading'>
        <Skeleton className='h-7 w-32 rounded' />
        <Skeleton className='h-16 w-full rounded-xl' />
        <Skeleton className='h-16 w-full rounded-xl' />
    </div>
);

// "Ver todos los espacios" from WorkspaceSwitcher — unlike Home (`/`), this
// never redirects away even when there's exactly one workspace, since seeing
// everything is the whole point of navigating here on purpose.
export default function WorkspacesPage() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspaces, isPending } = useQuery(workspacesQuery({ enabled: !!user }));

    if (isAuthLoading || !user || isPending) return <Loading />;

    return (
        <div className='flex flex-1 flex-col' data-block='WorkspacesPage'>
            <div className='p-4 pb-0'>
                <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    Espacios
                </p>
                <h1 className='font-heading text-2xl font-semibold tracking-tight'>
                    Tus espacios
                </h1>
            </div>
            <WorkspacesOverview workspaces={workspaces} />
        </div>
    );
}
