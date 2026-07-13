'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HouseIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-2 p-4' data-block='HomeLoading'>
        <Skeleton className='h-16 w-full rounded-xl' />
        <Skeleton className='h-16 w-full rounded-xl' />
    </div>
);

export default function Home() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspaces, isPending } = useQuery(workspacesQuery({ enabled: !!user }));

    useEffect(() => {
        if (workspaces?.length === 1) router.replace(`/workspace/${workspaces[0].id}`);
    }, [workspaces, router]);

    if (isAuthLoading || !user || isPending || workspaces?.length === 1) return <Loading />;

    if (!workspaces?.length) {
        return (
            <Empty className='flex-1' data-block='WorkspacesEmpty'>
                <EmptyHeader>
                    <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                        <HouseIcon />
                    </EmptyMedia>
                    <EmptyTitle>Sin espacios todavía</EmptyTitle>
                    <EmptyDescription>Tu espacio se está preparando.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className='flex flex-col gap-2 p-4' data-block='WorkspacesList'>
            {workspaces.map(workspace => (
                <Link
                    key={workspace.id}
                    href={`/workspace/${workspace.id}`}
                    className='group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-4 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                >
                    <span
                        aria-hidden
                        className='absolute inset-y-0 left-0 w-1 bg-(--ws-color)'
                        style={{ '--ws-color': resolveWorkspaceColor(workspace) }}
                    />
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                        <HouseIcon />
                    </span>
                    <span className='min-w-0 flex-1 truncate font-medium'>{workspace.name}</span>
                    <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                </Link>
            ))}
        </div>
    );
}
