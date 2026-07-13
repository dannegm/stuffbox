'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, SpinnerIcon } from '@phosphor-icons/react/ssr';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { geocodeAutocompleteQuery } from '@/queries/geocode';
import { cn } from '@/helpers/utils';

const MIN_QUERY_LENGTH = 3;

// Hand-rolled instead of Popover — a combobox where the dropdown opens on
// focus/typing (not a trigger click) fights Popover's own click-toggle
// semantics, so plain state + click-outside is simpler and more predictable.
export const AddressSearch = ({ onSelect, className }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const $container = useRef(null);
    const debouncedQuery = useDebouncedValue(query, 300);
    const isEnabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

    const { data: results, isFetching } = useQuery(
        geocodeAutocompleteQuery(debouncedQuery.trim(), { enabled: isEnabled }),
    );

    useEffect(() => {
        const handleClickOutside = event => {
            if ($container.current && !$container.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = result => {
        onSelect({ lat: result.lat, lng: result.lng });
        setQuery(result.label);
        setOpen(false);
    };

    const showDropdown = open && isEnabled;

    return (
        <div ref={$container} className={cn('relative', className)} data-block='AddressSearch'>
            <InputGroup className='bg-popover/95 shadow-md shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-sm'>
                <InputGroupAddon>
                    {isFetching ? (
                        <SpinnerIcon weight='bold' className='size-4 animate-spin' />
                    ) : (
                        <MagnifyingGlassIcon className='size-4' />
                    )}
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={event => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder='Buscar dirección'
                />
            </InputGroup>

            {showDropdown && (
                <div className='absolute top-full right-0 left-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-md bg-popover/95 p-1 shadow-md shadow-black/10 ring-1 ring-foreground/10 backdrop-blur-sm'>
                    {!results?.length ? (
                        <p className='p-3 text-center text-sm text-muted-foreground'>
                            {isFetching ? 'Buscando…' : 'Sin resultados.'}
                        </p>
                    ) : (
                        results.map(result => (
                            <button
                                key={`${result.lat},${result.lng}`}
                                type='button'
                                onClick={() => handleSelect(result)}
                                className='w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
                            >
                                {result.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
