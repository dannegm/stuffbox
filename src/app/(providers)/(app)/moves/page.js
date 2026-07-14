'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, TruckIcon, AirplaneIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { movesQuery } from '@/queries/moves';
import { MoveDialog } from '@/components/moves/move-dialog';
import { getMoveStatusLabel } from '@/constants/move-status';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { cn } from '@/helpers/utils';

const STATUS_DOT = {
    planning: 'bg-muted-foreground',
    in_transit: 'bg-flourish',
    done: 'bg-emerald-500',
};

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='MovesLoading'
    >
        <Skeleton className='h-7 w-32 rounded' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
        </div>
    </div>
);

export default function MovesPage() {
    const pathname = usePathname();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const { data: moves, isPending: isMovesPending } = useQuery(
        movesQuery(workspace?.id, { enabled: !!workspace }),
    );

    if (isAuthLoading || !user || isWorkspacesPending || !workspace || isMovesPending) {
        return <Loading />;
    }

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='MovesPage'
        >
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='WorkspaceSettingsHero'
            >
                <div className='flex items-center gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                        <TruckIcon />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            Mudanzas
                        </h1>
                    </div>

                    <div className='flex-1 shrink-0' />

                    <Button variant='outline' size='sm' onClick={() => setDialogOpen(true)}>
                        <PlusIcon data-icon='inline-start' />
                        Nueva mudanza
                    </Button>
                </div>
            </div>

            {moves.length === 0 ? (
                <Empty className='flex-1' data-block='MovesEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-flourish/15 text-flourish'>
                            <TruckIcon />
                        </EmptyMedia>
                        <EmptyTitle>Sin mudanzas todavía</EmptyTitle>
                        <EmptyDescription>
                            Crea una para planear el traslado entre dos casas.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-2'>
                    {moves.map(move => (
                        <Link
                            key={move.id}
                            href={`/move/${move.id}`}
                            className='group flex items-center gap-3 rounded-xl border bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                        >
                            <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-flourish/15 text-flourish [&_svg]:size-4.5'>
                                {move.route_type === 'air' ? <AirplaneIcon /> : <TruckIcon />}
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-medium'>{move.name}</span>
                                <span className='flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            STATUS_DOT[move.status],
                                        )}
                                    />
                                    {move.origin?.name} → {move.destination?.name} ·{' '}
                                    {getMoveStatusLabel(move.status)}
                                </span>
                            </span>
                            <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                        </Link>
                    ))}
                </div>
            )}

            <MoveDialog workspaceId={workspace.id} open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
