'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Home01Icon } from '@hugeicons/core-free-icons';
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

    if (isAuthLoading || !user || isPending) return <Loading />;

    if (!workspaces?.length) {
        return (
            <Empty className='flex-1' data-block='WorkspacesEmpty'>
                <EmptyHeader>
                    <EmptyMedia variant='icon'>
                        <HugeiconsIcon icon={Home01Icon} />
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
                <div key={workspace.id} className='rounded-lg border p-4 text-sm'>
                    {workspace.name}
                </div>
            ))}
        </div>
    );
}
