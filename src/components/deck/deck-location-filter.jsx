'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HouseIcon, XIcon } from '@phosphor-icons/react/ssr';
import { LocationPicker } from '@/components/locations/location-picker';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { locationQuery } from '@/queries/locations';
import { getLocationIcon } from '@/helpers/location';
import { cn } from '@/helpers/utils';

// Same navigable tree as LocationPicker (pack/unpack/transfer), reused here
// to scope the deck queue down to one location's subtree instead of picking
// a move destination — `value` is a location id or null ("todas las
// ubicaciones", the default, no filtering).
export const DeckLocationFilter = ({ workspaceId, value, onChange, className }) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const hasSelection = !!value;
    const { data: location } = useQuery(locationQuery(value, { enabled: hasSelection }));

    return (
        <>
            <div
                className={cn(
                    'flex h-9 w-full min-w-0 items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs transition-colors',
                    hasSelection && 'border-primary/40 bg-primary/5',
                    className,
                )}
                data-block='DeckLocationFilter'
            >
                <button
                    type='button'
                    onClick={() => setPickerOpen(true)}
                    className='flex min-w-0 flex-1 items-center gap-1.5 text-left'
                >
                    <span
                        className={cn(
                            'flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4',
                            hasSelection && 'text-primary',
                        )}
                    >
                        {location ? <DynamicIcon icon={getLocationIcon(location)} /> : <HouseIcon />}
                    </span>
                    <span
                        className={cn('min-w-0 flex-1 truncate', !hasSelection && 'text-muted-foreground')}
                    >
                        {hasSelection ? (location?.name ?? '…') : 'Todas las ubicaciones'}
                    </span>
                </button>
                {hasSelection && (
                    <button
                        type='button'
                        aria-label='Quitar filtro'
                        onClick={() => onChange(null)}
                        className='flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                    >
                        <XIcon className='size-3.5' />
                    </button>
                )}
            </div>

            <LocationPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                workspaceId={workspaceId}
                onSelect={onChange}
                title='Filtrar por ubicación'
                description='Navega por el árbol y elige qué mostrar en la baraja.'
                getConfirmLabel={current => (current ? `Filtrar: ${current.name}` : 'Elegir una ubicación')}
            />
        </>
    );
};
