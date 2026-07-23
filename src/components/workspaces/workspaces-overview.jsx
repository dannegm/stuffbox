'use client';

import Link from 'next/link';
import { HouseIcon, CaretRightIcon, PlusIcon } from '@phosphor-icons/react/ssr';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/ui/empty';
import { Button } from '@/ui/button';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';

// Shared by Home (`/`, which redirects away on its own when there's exactly
// one workspace, so only ever mounts this for 0 or 2+) and `/workspaces`
// ("ver todos los espacios" from the switcher, which never redirects — even
// with exactly one, showing everything is the whole point of that route).
export const WorkspacesOverview = ({ workspaces }) => {
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
};
