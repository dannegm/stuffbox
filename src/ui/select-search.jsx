'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { useFocusWithoutScroll } from '@/hooks/use-focus-without-scroll';
import { cn } from '@/helpers/utils';

// Below this many options, scanning by eye beats typing — the search box
// only earns its place once there's enough to actually search through.
const SEARCH_THRESHOLD = 10;
// fit-content(14rem) instead of a plain h-56: ScrollArea's viewport is
// height:100% of this box, so a plain max-height alone can't shrink it below
// 14rem (percentage heights don't resolve against max-height, only against
// an explicit/definite height) — fit-content gives it a real definite height
// that's still capped, so short lists shrink and long lists scroll.
const LIST_HEIGHT = 'h-[fit-content(14rem)] max-h-56 overflow-auto';

// A searchable option list in a Popover, modeled on pinia's CategorySelect
// (src/components/categories/category-select.jsx) — generalized so every
// "pick one from a list" dropdown in this app (location type, condition,
// orientation, etc.) gets the same scroll-capped, conditionally-searchable
// treatment instead of a plain DropdownMenu.
export const SelectSearch = ({
    options,
    value,
    onChange,
    getKey = option => option.value,
    getLabel = option => option.label,
    renderOption,
    placeholder = 'Elegir…',
    searchPlaceholder = 'Buscar…',
    emptyLabel = 'Sin resultados.',
    triggerClassName,
    contentClassName,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const focusRef = useFocusWithoutScroll();

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(option => getLabel(option).toLowerCase().includes(q));
    }, [options, query, getLabel]);

    const selected = options.find(option => getKey(option) === value);
    const showSearch = options.length > SEARCH_THRESHOLD;

    const handleSelect = option => {
        onChange(getKey(option));
        setOpen(false);
        setQuery('');
    };

    return (
        <Popover
            open={open}
            onOpenChange={next => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <PopoverTrigger
                render={
                    <button
                        type='button'
                        className={cn(
                            'flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-left text-sm shadow-xs transition-colors hover:bg-muted',
                            triggerClassName,
                        )}
                    />
                }
            >
                {selected ? (
                    <span className='flex min-w-0 flex-1 items-center gap-1.5 truncate'>
                        {renderOption ? renderOption(selected) : getLabel(selected)}
                    </span>
                ) : (
                    <span className='flex-1 truncate text-muted-foreground'>{placeholder}</span>
                )}
            </PopoverTrigger>
            <PopoverContent className={cn('w-64 gap-2 p-2', contentClassName)} align='start'>
                {showSearch && (
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
                )}
                <ScrollArea className={LIST_HEIGHT}>
                    <div className='flex flex-col gap-0.5 p-0.5'>
                        {results.map(option => (
                            <button
                                key={getKey(option)}
                                type='button'
                                onClick={() => handleSelect(option)}
                                className='flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
                            >
                                {renderOption ? renderOption(option) : getLabel(option)}
                            </button>
                        ))}
                        {results.length === 0 && (
                            <p className='p-4 text-center text-sm text-muted-foreground'>
                                {emptyLabel}
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
