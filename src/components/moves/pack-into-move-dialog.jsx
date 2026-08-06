'use client';

import { useQuery } from '@tanstack/react-query';
import { PackageIcon, TruckIcon, AirplaneIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { ScrollArea } from '@/ui/scroll-area';
import { Skeleton } from '@/ui/skeleton';
import { getMoveStatusLabel, getMoveStatusDot } from '@/constants/move-status';
import { movesQuery } from '@/queries/moves';
import { cn } from '@/helpers/utils';

const Loading = () => (
    <div className='flex flex-col gap-2 py-1' data-block='PackIntoMoveLoading'>
        <Skeleton className='h-16 w-full rounded-lg' />
        <Skeleton className='h-16 w-full rounded-lg' />
    </div>
);

// Flat single-level list, click-to-select-and-close — unlike LocationPicker
// there's nothing to drill into, so no separate confirm step is needed.
// This is "the packing moment" stuffbox-plan.md calls out for extra
// skeuomorphic flourish — rows lean on the same dashed-border, printed-tag
// language as MoveTag/PackedTape, so choosing where to pack feels like
// picking a shipping tag off a rack rather than filling out a plain form.
export const PackIntoMoveDialog = ({ workspaceId, open, onOpenChange, onSelect }) => {
    const { data: moves, isPending } = useQuery(movesQuery(workspaceId, { enabled: open }));
    const openMoves = (moves ?? []).filter(move => move.status !== 'done');

    const handleSelect = move => {
        onSelect(move.id);
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='PackIntoMoveDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Empacar en mudanza</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <ScrollArea className='h-[fit-content(16rem)] px-4 sm:px-0'>
                    {isPending ? (
                        <Loading />
                    ) : (
                        <div className='flex flex-col gap-2 pb-2'>
                            {openMoves.map(move => (
                                <button
                                    key={move.id}
                                    type='button'
                                    onClick={() => handleSelect(move)}
                                    className='group relative flex items-center gap-3 rounded-lg border border-dashed border-flourish/40 bg-card p-3 text-left text-sm shadow-xs transition-all hover:-translate-y-0.5 hover:border-flourish hover:shadow-md hover:shadow-black/10'
                                    data-block='PackIntoMoveOption'
                                >
                                    <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-flourish/15 text-flourish [&_svg]:size-4'>
                                        {move.route_type === 'air' ? (
                                            <AirplaneIcon />
                                        ) : (
                                            <TruckIcon />
                                        )}
                                    </span>
                                    <span className='min-w-0 flex-1'>
                                        <span className='block truncate font-medium'>
                                            {move.name}
                                        </span>
                                        <span className='flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'size-1.5 shrink-0 rounded-full',
                                                    getMoveStatusDot(move),
                                                )}
                                            />
                                            {move.origin?.name} → {move.destination?.name} ·{' '}
                                            {getMoveStatusLabel(move.status)}
                                        </span>
                                    </span>
                                    <PackageIcon className='size-4 shrink-0 text-flourish/50 transition-transform group-hover:rotate-6' />
                                </button>
                            ))}
                            {openMoves.length === 0 && (
                                <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
                                    <span className='flex size-10 items-center justify-center rounded-xl bg-flourish/15 text-flourish [&_svg]:size-5'>
                                        <TruckIcon />
                                    </span>
                                    <p className='text-sm text-muted-foreground'>
                                        No hay mudanzas activas — crea una en Mudanzas.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
