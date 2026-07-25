'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
    useResponsivePopoverMobile,
} from '@/ui/responsive-popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { Separator } from '@/ui/separator';
import { Button } from '@/ui/button';
import { useFocusWithoutScroll } from '@/hooks/use-focus-without-scroll';
import { cn } from '@/helpers/utils';

// Generic multi-select popover filter — backs the type/casa filters on the
// search page (checkbox-style, same as tags: pick several, not just one).
// A fixed-height trigger that collapses to "N seleccionados" once more than
// a couple options are checked, so it never grows past one grid cell.
const NAME_LIMIT = 2;

export const MultiSelectFilter = ({
    icon: Icon,
    options,
    value = [],
    onChange,
    getKey = option => option.value,
    getLabel = option => option.label,
    renderOption,
    placeholder = 'Elegir…',
    searchPlaceholder = 'Buscar…',
    emptyLabel = 'Sin resultados.',
    countLabel = count => `${count} seleccionados`,
    className,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const focusRef = useFocusWithoutScroll();
    const isMobile = useResponsivePopoverMobile();

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter(option => getLabel(option).toLowerCase().includes(q)) : options;
    }, [options, query, getLabel]);

    const selected = options.filter(option => value.includes(getKey(option)));
    const hasSelection = value.length > 0;

    const toggle = key =>
        onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key]);

    const label =
        selected.length === 0
            ? placeholder
            : selected.length <= NAME_LIMIT
              ? selected.map(getLabel).join(', ')
              : countLabel(selected.length);

    return (
        <ResponsivePopover open={open} onOpenChange={setOpen}>
            <ResponsivePopoverTrigger
                render={
                    <button
                        type='button'
                        className={cn(
                            'flex h-9 w-full min-w-0 items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-left text-sm shadow-xs transition-colors hover:bg-muted',
                            { 'border-primary/40 bg-primary/5': hasSelection },
                            className,
                        )}
                    />
                }
            >
                {Icon && (
                    <Icon
                        className={cn('size-4 shrink-0 text-muted-foreground', {
                            'text-primary': hasSelection,
                        })}
                    />
                )}
                <span
                    className={cn('min-w-0 flex-1 truncate', {
                        'text-muted-foreground': !hasSelection,
                    })}
                >
                    {label}
                </span>
                {hasSelection && (
                    <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground'>
                        {value.length}
                    </span>
                )}
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent className='w-64 gap-2 p-2' align='start'>
                <InputGroup>
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        ref={focusRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                    />
                </InputGroup>
                <div
                    className={cn({
                        'h-48': isMobile,
                        'h-[fit-content(12rem)] max-h-48': !isMobile,
                    })}
                >
                    <ScrollArea className='size-full overflow-auto'>
                        <div className='flex flex-col gap-0.5 p-0.5'>
                            {results.map(option => {
                                const key = getKey(option);
                                const active = value.includes(key);
                                return (
                                    <button
                                        key={key}
                                        type='button'
                                        onClick={() => toggle(key)}
                                        className='flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
                                    >
                                        <span className='flex min-w-0 flex-1 items-center gap-2'>
                                            {renderOption ? (
                                                renderOption(option)
                                            ) : (
                                                <span className='truncate'>
                                                    {getLabel(option)}
                                                </span>
                                            )}
                                        </span>
                                        {active && (
                                            <CheckIcon className='size-4 shrink-0 text-primary' />
                                        )}
                                    </button>
                                );
                            })}
                            {results.length === 0 && (
                                <p className='p-4 text-center text-sm text-muted-foreground'>
                                    {emptyLabel}
                                </p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                {hasSelection && (
                    <>
                        <Separator />
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='w-full'
                            onClick={() => onChange([])}
                        >
                            Limpiar filtro
                        </Button>
                    </>
                )}
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
