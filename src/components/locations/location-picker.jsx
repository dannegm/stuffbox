'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretRightIcon, HouseIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { ScrollArea } from '@/ui/scroll-area';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { locationChildrenQuery } from '@/queries/locations';
import { cn } from '@/helpers/utils';

// The plan's core interaction (§7): breadcrumb + drill-down through the
// unbounded tree, "dejar aquí" at any level once inside a location, recurses
// into boxes for free since boxes are just another location node. Reused
// as-is for transfer, pack-into-box, and unpack destination.
export const LocationPicker = ({ open, onOpenChange, workspaceId, onSelect }) => {
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
        setStack([...stack, { id: location.id, name: location.name }]);
    const handleBreadcrumbClick = index => setStack(stack.slice(0, index + 1));
    const handleConfirm = () => {
        onSelect(current?.id);
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='LocationPicker'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Elegir destino</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>

                <div className='flex flex-wrap items-center gap-1 px-4 text-sm text-muted-foreground sm:px-0'>
                    <button
                        type='button'
                        onClick={() => setStack([])}
                        className={cn(
                            'flex items-center gap-1 hover:text-foreground',
                            !current && 'font-medium text-foreground',
                        )}
                    >
                        <HouseIcon className='size-3.5' />
                        Casas
                    </button>
                    {stack.map((level, index) => (
                        <span key={level.id} className='flex items-center gap-1'>
                            <CaretRightIcon className='size-3.5 shrink-0' />
                            <button
                                type='button'
                                onClick={() => handleBreadcrumbClick(index)}
                                className={cn(
                                    'truncate hover:text-foreground',
                                    index === stack.length - 1 && 'font-medium text-foreground',
                                )}
                            >
                                {level.name}
                            </button>
                        </span>
                    ))}
                </div>

                <ScrollArea className='h-[fit-content(16rem)] px-4 sm:px-0'>
                    {isPending ? (
                        <div className='flex items-center justify-center py-8'>
                            <Spinner className='size-5' />
                        </div>
                    ) : (
                        <div className='flex flex-col gap-1 pb-2'>
                            {children?.map(location => (
                                <button
                                    key={location.id}
                                    type='button'
                                    onClick={() => handleDrillIn(location)}
                                    className='flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted'
                                >
                                    <DynamicIcon icon={getLocationIcon(location)} />
                                    <span className='min-w-0 flex-1 truncate'>{location.name}</span>
                                    <CaretRightIcon className='size-3.5 shrink-0 text-muted-foreground' />
                                </button>
                            ))}
                            {children?.length === 0 && (
                                <p className='p-4 text-center text-sm text-muted-foreground'>
                                    Vacío.
                                </p>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <ResponsiveDialogFooter>
                    <Button type='button' disabled={!current} onClick={handleConfirm}>
                        Dejar aquí{current ? `: ${current.name}` : ''}
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
