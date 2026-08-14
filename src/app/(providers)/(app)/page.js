'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { usePageTitle } from '@/hooks/use-page-title';
import { workspacesQuery } from '@/queries/workspaces';
import { WorkspacesOverview } from '@/components/workspaces/workspaces-overview';
import { Skeleton } from '@/ui/skeleton';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-2 p-4' data-block='HomeLoading'>
        <Skeleton className='h-16 w-full rounded-xl' />
        <Skeleton className='h-16 w-full rounded-xl' />
    </div>
);

export default function Home() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();
    usePageTitle('Inicio');

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspaces, isPending } = useQuery(workspacesQuery({ enabled: !!user }));

    useEffect(() => {
        if (workspaces?.length === 1) router.replace(`/workspace/${workspaces[0].id}`);
    }, [workspaces, router]);

    if (isAuthLoading || !user || isPending || workspaces?.length === 1) return <Loading />;

    return <WorkspacesOverview workspaces={workspaces} />;
}
