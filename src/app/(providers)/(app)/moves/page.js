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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='MovesLoading'>
        <Spinner className='size-6' />
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
            <div className='flex items-center justify-between gap-2'>
                <h1 className='font-heading text-lg font-medium'>Mudanzas</h1>
                <Button size='sm' onClick={() => setDialogOpen(true)}>
                    <PlusIcon data-icon='inline-start' />
                    Nueva mudanza
                </Button>
            </div>

            {moves.length === 0 ? (
                <Empty className='flex-1' data-block='MovesEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon'>
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
                            className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted'
                        >
                            <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                {move.route_type === 'air' ? <AirplaneIcon /> : <TruckIcon />}
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-medium'>{move.name}</span>
                                <span className='block truncate text-xs text-muted-foreground'>
                                    {move.origin?.name} → {move.destination?.name} ·{' '}
                                    {getMoveStatusLabel(move.status)}
                                </span>
                            </span>
                            <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />
                        </Link>
                    ))}
                </div>
            )}

            <MoveDialog workspaceId={workspace.id} open={dialogOpen} onOpenChange={setDialogOpen} />
        </div>
    );
}
