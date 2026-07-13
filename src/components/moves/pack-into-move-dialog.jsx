'use client';

import { useQuery } from '@tanstack/react-query';
import { PackageIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { ScrollArea } from '@/ui/scroll-area';
import { Spinner } from '@/ui/spinner';
import { movesQuery } from '@/queries/moves';

// Flat single-level list, click-to-select-and-close — unlike LocationPicker
// there's nothing to drill into, so no separate confirm step is needed.
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
                        <div className='flex items-center justify-center py-8'>
                            <Spinner className='size-5' />
                        </div>
                    ) : (
                        <div className='flex flex-col gap-1 pb-2'>
                            {openMoves.map(move => (
                                <button
                                    key={move.id}
                                    type='button'
                                    onClick={() => handleSelect(move)}
                                    className='flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted'
                                >
                                    <span className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground'>
                                        <PackageIcon className='size-4' />
                                    </span>
                                    <span className='min-w-0 flex-1 truncate'>
                                        <span className='block font-medium'>{move.name}</span>
                                        <span className='block truncate text-xs text-muted-foreground'>
                                            {move.origin?.name} → {move.destination?.name}
                                        </span>
                                    </span>
                                </button>
                            ))}
                            {openMoves.length === 0 && (
                                <p className='p-4 text-center text-sm text-muted-foreground'>
                                    No hay mudanzas activas — crea una en Mudanzas.
                                </p>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
