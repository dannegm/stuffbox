'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HouseIcon, UsersIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react/ssr';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/ui/empty';
import { Button } from '@/ui/button';
import { WorkspaceAvatar } from '@/components/layout/workspace-switcher';
import { workspaceStatsQuery } from '@/queries/workspaces';

// Shared by Home (`/`, which redirects away on its own when there's exactly
// one workspace, so only ever mounts this for 0 or 2+) and `/workspaces`
// ("ver todos los espacios" from the switcher, which never redirects — even
// with exactly one, showing everything is the whole point of that route).
export const WorkspacesOverview = ({ workspaces }) => {
    const { data: stats } = useQuery(
        workspaceStatsQuery(workspaces?.map(workspace => workspace.id) ?? []),
    );

    if (!workspaces?.length) {
        return (
            <Empty className='flex-1' data-block='WorkspacesEmpty'>
                <EmptyHeader>
                    <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                        <HouseIcon />
                    </EmptyMedia>
                    <EmptyTitle>Sin espacios todavía</EmptyTitle>
                    <EmptyDescription>
                        Crea tu primer espacio para empezar a organizar tu inventario.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button render={<Link href='/workspace/new' />}>
                        <PlusIcon data-icon='inline-start' />
                        Crear espacio
                    </Button>
                </EmptyContent>
            </Empty>
        );
    }

    return (
        <div
            className='grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3'
            data-block='WorkspacesList'
        >
            {workspaces.map(workspace => {
                const workspaceStats = stats?.[workspace.id];
                return (
                    <Link
                        key={workspace.id}
                        href={`/workspace/${workspace.id}`}
                        className='group flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                    >
                        <WorkspaceAvatar workspace={workspace} size='lg' className='rounded-xl' />
                        <div className='min-w-0 flex-1'>
                            <p className='truncate font-heading font-medium'>{workspace.name}</p>
                            <div className='mt-0.5 flex items-center gap-3 text-xs text-muted-foreground'>
                                <span className='flex items-center gap-1'>
                                    <HouseIcon className='size-3.5' />
                                    {workspaceStats?.locations ?? 0} ubicaciones
                                </span>
                                <span className='flex items-center gap-1'>
                                    <UsersIcon className='size-3.5' />
                                    {workspaceStats?.members ?? 0}
                                </span>
                            </div>
                        </div>
                        <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                    </Link>
                );
            })}
        </div>
    );
};
