'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
    useResponsivePopoverMobile,
} from '@/ui/responsive-popover';
import { InputGroup, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { tagsQuery } from '@/queries/tags';
import { useFocusWithoutScroll } from '@/hooks/use-focus-without-scroll';
import { cn } from '@/helpers/utils';

// Multi-select over pre-created tags only — tags are managed as their own
// entity from /tags (name/color/icon, full CRUD), not created ad hoc here.
export const TagPicker = ({ workspaceId, value = [], onChange }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const focusRef = useFocusWithoutScroll();
    const isMobile = useResponsivePopoverMobile();
    const { data: tags = [] } = useQuery(tagsQuery(workspaceId));

    const toggle = tagId => {
        onChange(value.includes(tagId) ? value.filter(id => id !== tagId) : [...value, tagId]);
    };

    const q = query.trim().toLowerCase();
    const results = q ? tags.filter(tag => tag.name.toLowerCase().includes(q)) : tags;
    const selectedTags = tags.filter(tag => value.includes(tag.id));

    return (
        <ResponsivePopover open={open} onOpenChange={setOpen}>
            <ResponsivePopoverTrigger
                render={
                    <button
                        type='button'
                        className='flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-left text-sm shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted'
                    />
                }
            >
                {selectedTags.length === 0 ? (
                    <span className='text-muted-foreground'>Sin tags</span>
                ) : (
                    selectedTags.map(tag => (
                        <span
                            key={tag.id}
                            className='flex items-center gap-1 rounded-full bg-(--tag-color)/15 px-2 py-0.5 text-xs font-medium text-(--tag-color) ring-1 ring-(--tag-color)/20'
                            style={{ '--tag-color': tag.color }}
                        >
                            <DynamicIcon icon={tag.icon ?? FALLBACK_TAG_ICON} className='size-3' />
                            {tag.name}
                        </span>
                    ))
                )}
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent className='w-64 gap-2 p-2' align='start'>
                <InputGroup>
                    <InputGroupInput
                        ref={focusRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder='Buscar tag'
                    />
                </InputGroup>
                <ScrollArea
                    className={cn('overflow-auto', {
                        'h-48': isMobile,
                        'h-[fit-content(12rem)] max-h-48': !isMobile,
                    })}
                >
                    <div className='flex flex-col gap-0.5 p-0.5'>
                        {results.map(tag => (
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
                                {value.includes(tag.id) && (
                                    <CheckIcon className='size-4 shrink-0 text-primary' />
                                )}
                            </button>
                        ))}
                        {results.length === 0 && (
                            <p className='p-4 text-center text-sm text-muted-foreground'>
                                {tags.length === 0
                                    ? 'Sin tags todavía — créalos en Tags.'
                                    : 'Sin resultados.'}
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
