'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SquaresFourIcon, PlusIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { WorkspacesOverview } from '@/components/workspaces/workspaces-overview';
import { Button } from '@/ui/button';
import { Stat } from '@/ui/stat';
import { Skeleton } from '@/ui/skeleton';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspacesPageLoading'>
        <Skeleton className='h-28 w-full rounded-2xl' />
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            <Skeleton className='h-20 rounded-2xl' />
            <Skeleton className='h-20 rounded-2xl' />
            <Skeleton className='h-20 rounded-2xl' />
        </div>
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
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspacesPage'>
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-5 ring-1 ring-foreground/10'
                data-block='WorkspacesHero'
            >
                <div className='flex items-start gap-3'>
                    <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-card/80 text-primary shadow-xs ring-1 ring-foreground/10 [&_svg]:size-5'>
                        <SquaresFourIcon />
                    </span>
                    <div className='min-w-0 flex-1'>
                        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Espacios
                        </p>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            Tus espacios
                        </h1>
                    </div>
                    <Button size='sm' variant='outline' render={<Link href='/workspace/new' />}>
                        <PlusIcon data-icon='inline-start' />
                        <span className='hidden sm:inline'>Crear espacio</span>
                    </Button>
                </div>

                <div className='mt-5'>
                    <Stat icon={SquaresFourIcon} value={workspaces.length} label='espacios' />
                </div>
            </div>

            <WorkspacesOverview workspaces={workspaces} />
        </div>
    );
}
