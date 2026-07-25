'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { useFocusWithoutScroll } from '@/hooks/use-focus-without-scroll';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/helpers/utils';

// Below this many options, scanning by eye beats typing — the search box
// only earns its place once there's enough to actually search through.
const SEARCH_THRESHOLD = 10;
// The fixed/fit-content height lives on this wrapper, not on ScrollArea
// itself — ScrollArea's viewport is height:100% of its Root, so the Root
// needs a real definite height under it to resolve against; putting the
// sizing one layer up and letting ScrollArea just fill it (size-full) keeps
// that definite-height math from depending on ScrollArea's own internals.
// fit-content(14rem) still lets short lists shrink and long lists scroll on
// desktop; on mobile (rendered inside a Drawer) that shrink is unwanted — a
// short list leaves the sheet awkwardly small, so it's pinned to the same
// 14rem instead of tracking content.
const LIST_HEIGHT = isMobile => ({
    'h-56': isMobile,
    'h-[fit-content(14rem)] max-h-56': !isMobile,
});

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
    const isMobile = useIsMobile();

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
        <ResponsivePopover
            open={open}
            onOpenChange={next => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <ResponsivePopoverTrigger
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
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent
                className={cn('w-64 gap-2 p-2', contentClassName)}
                align='start'
            >
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
                <div className={cn(LIST_HEIGHT(isMobile))}>
                    <ScrollArea className='size-full overflow-auto'>
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
                </div>
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
