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

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='HomeLoading'>
        <Spinner className='size-6' />
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
                    <EmptyMedia variant='icon'>
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
                    className='flex items-center justify-between gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-muted'
                >
                    {workspace.name}
                    <CaretRightIcon className='size-4 text-muted-foreground' />
                </Link>
            ))}
        </div>
    );
}
