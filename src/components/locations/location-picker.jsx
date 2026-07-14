'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowCounterClockwiseIcon,
    CaretRightIcon,
    CheckCircleIcon,
    HouseIcon,
} from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { ScrollArea } from '@/ui/scroll-area';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { FALLBACK_LOCATION_ICON } from '@/constants/location-icons';
import { locationChildrenQuery } from '@/queries/locations';
import { cn } from '@/helpers/utils';

// Row-shaped placeholders instead of a centered spinner — keeps the dialog's
// height stable while the next level loads instead of collapsing to a
// spinner then popping back out to full rows.
const RowsSkeleton = () => (
    <div className='flex flex-col gap-1 pb-2' data-block='LocationPickerSkeleton'>
        {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='flex items-center gap-3 p-2'>
                <Skeleton className='size-9 shrink-0 rounded-md' />
                <Skeleton className='h-4 flex-1 rounded' />
            </div>
        ))}
    </div>
);

// The plan's core interaction (§7): breadcrumb + drill-down through the
// unbounded tree, "dejar aquí" at any level once inside a location, recurses
// into boxes for free since boxes are just another location node. Reused
// as-is for transfer, pack-into-box, and unpack destination.
//
// `quickDestination` (optional, `{ id, name, icon? }`) adds a shortcut row
// above the tree navigator that selects it directly — for unpack specifically,
// this is "the place it was already at": packing never moves anything (only
// flags active_move_id, db.sql), so an item/box's location_id/parent_id is
// still wherever it was before the move, and un-packing back into that exact
// spot shouldn't require re-navigating the tree to find it again. Omit the
// prop entirely for transfer/pack-into-box, where there's no such shortcut.
export const LocationPicker = ({ open, onOpenChange, workspaceId, onSelect, quickDestination }) => {
    const [stack, setStack] = useState([]);
    const current = stack[stack.length - 1] ?? null;

    useEffect(() => {
        if (open) setStack([]);
    }, [open]);

    const { data: children, isPending } = useQuery(
        locationChildrenQuery(
            { workspaceId, parentId: current?.id ?? null },
            { enabled: open && !!workspaceId },
        ),
    );

    const handleDrillIn = location =>
        setStack([
            ...stack,
            { id: location.id, name: location.name, icon: getLocationIcon(location) },
        ]);
    const handleBreadcrumbClick = index => setStack(stack.slice(0, index + 1));
    const handleConfirm = () => {
        onSelect(current?.id);
        onOpenChange(false);
    };
    const handleQuickSelect = () => {
        onSelect(quickDestination.id);
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='LocationPicker'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Elegir destino</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Navega por el árbol y elige dónde dejarlo.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>

                {quickDestination && (
                    <div className='px-4 sm:px-0'>
                        <button
                            type='button'
                            onClick={handleQuickSelect}
                            className='group flex w-full items-center gap-3 rounded-lg border border-dashed border-flourish/40 bg-flourish/5 p-2.5 text-left text-sm transition-colors hover:bg-flourish/10'
                        >
                            <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-flourish/15 text-flourish [&_svg]:size-4'>
                                <ArrowCounterClockwiseIcon />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-medium'>
                                    Desempacar aquí mismo
                                </span>
                                <span className='block truncate text-xs text-muted-foreground'>
                                    {quickDestination.name}
                                </span>
                            </span>
                            <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground' />
                        </button>
                    </div>
                )}

                <div className='px-4 sm:px-0'>
                    <div className='flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1 text-sm text-muted-foreground'>
                        <button
                            type='button'
                            onClick={() => setStack([])}
                            className={cn(
                                'flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-foreground',
                                !current && 'bg-card font-medium text-foreground shadow-xs',
                            )}
                        >
                            <HouseIcon className='size-3.5 shrink-0' />
                            Casas
                        </button>
                        {stack.map((level, index) => (
                            <span key={level.id} className='flex min-w-0 items-center gap-1'>
                                <CaretRightIcon className='size-3.5 shrink-0 text-muted-foreground/60' />
                                <button
                                    type='button'
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className={cn(
                                        'flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:text-foreground',
                                        index === stack.length - 1 &&
                                            'bg-card font-medium text-foreground shadow-xs',
                                    )}
                                >
                                    {level.icon && (
                                        <DynamicIcon
                                            icon={level.icon}
                                            className='size-3.5 shrink-0'
                                        />
                                    )}
                                    <span className='max-w-24 truncate sm:max-w-36'>
                                        {level.name}
                                    </span>
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <ScrollArea className='h-[fit-content(16rem)] px-4 sm:px-0'>
                    {isPending ? (
                        <RowsSkeleton />
                    ) : (
                        <div className='flex flex-col gap-1 pb-2'>
                            {children?.map(location => (
                                <button
                                    key={location.id}
                                    type='button'
                                    onClick={() => handleDrillIn(location)}
                                    className='group flex items-center gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted'
                                >
                                    <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary [&_svg]:size-4'>
                                        <DynamicIcon icon={getLocationIcon(location)} />
                                    </span>
                                    <span className='min-w-0 flex-1'>
                                        <span className='block truncate font-medium'>
                                            {location.name}
                                        </span>
                                        <span className='block truncate text-xs text-muted-foreground capitalize'>
                                            {location.type}
                                        </span>
                                    </span>
                                    <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground' />
                                </button>
                            ))}
                            {children?.length === 0 && (
                                <div
                                    className='flex flex-col items-center gap-2 px-4 py-10 text-center'
                                    data-block='LocationPickerEmpty'
                                >
                                    <span className='flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5'>
                                        <DynamicIcon icon={FALLBACK_LOCATION_ICON} />
                                    </span>
                                    <p className='text-sm text-muted-foreground'>
                                        Nada aquí todavía.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <ResponsiveDialogFooter>
                    <Button type='button' disabled={!current} onClick={handleConfirm}>
                        <CheckCircleIcon data-icon='inline-start' />
                        {current ? `Dejar aquí: ${current.name}` : 'Elegir un destino'}
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
