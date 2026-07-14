'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TagIcon, CheckIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { Separator } from '@/ui/separator';
import { Button } from '@/ui/button';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { tagsQuery } from '@/queries/tags';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { useFocusWithoutScroll } from '@/hooks/use-focus-without-scroll';
import { cn } from '@/helpers/utils';

// Standalone from TagPicker (src/components/items/tag-picker.jsx) on purpose —
// that one is the item-tag *editor* (always wraps every selected tag as a
// pill, since editing needs to see the full set) and touching it risked
// regressing that flow. This is a compact *filter* trigger instead, modeled
// on pinia's CategoryFilterSelect: a single fixed-height row that collapses
// to "N tags" once more than a couple are selected, so it never grows past
// one grid cell.
const NAME_LIMIT = 2;

export const SearchTagFilter = ({ workspaceId, value = [], onChange, className }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const focusRef = useFocusWithoutScroll();
    const { data: tags = [] } = useQuery(tagsQuery(workspaceId, { enabled: !!workspaceId }));

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? tags.filter(tag => tag.name.toLowerCase().includes(q)) : tags;
    }, [tags, query]);

    const selectedTags = tags.filter(tag => value.includes(tag.id));
    const hasSelection = value.length > 0;

    const toggle = tagId =>
        onChange(value.includes(tagId) ? value.filter(id => id !== tagId) : [...value, tagId]);

    const label =
        selectedTags.length === 0
            ? 'Tags'
            : selectedTags.length <= NAME_LIMIT
              ? selectedTags.map(tag => tag.name).join(', ')
              : `${selectedTags.length} tags`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
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
                <TagIcon
                    className={cn('size-4 shrink-0 text-muted-foreground', {
                        'text-primary': hasSelection,
                    })}
                />
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
            </PopoverTrigger>
            <PopoverContent className='w-64 gap-2 p-2' align='start'>
                <InputGroup>
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        ref={focusRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder='Buscar tag'
                    />
                </InputGroup>
                <ScrollArea className='h-[fit-content(12rem)] max-h-48 overflow-auto'>
                    <div className='flex flex-col gap-0.5 p-0.5'>
                        {results.map(tag => {
                            const active = value.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type='button'
                                    onClick={() => toggle(tag.id)}
                                    className='flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
                                >
                                    <span
                                        className='flex size-6 shrink-0 items-center justify-center rounded-md bg-(--tag-color)/15 text-(--tag-color) ring-1 ring-(--tag-color)/15 [&_svg]:size-3.5'
                                        style={{ '--tag-color': tag.color }}
                                    >
                                        <DynamicIcon icon={tag.icon ?? FALLBACK_TAG_ICON} />
                                    </span>
                                    <span className='min-w-0 flex-1 truncate'>{tag.name}</span>
                                    {active && (
                                        <CheckIcon className='size-4 shrink-0 text-primary' />
                                    )}
                                </button>
                            );
                        })}
                        {results.length === 0 && (
                            <p className='p-4 text-center text-sm text-muted-foreground'>
                                {tags.length === 0 ? 'Sin tags todavía.' : 'Sin resultados.'}
                            </p>
                        )}
                    </div>
                </ScrollArea>
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
            </PopoverContent>
        </Popover>
    );
};
