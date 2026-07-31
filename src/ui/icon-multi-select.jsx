'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, CheckIcon } from '@phosphor-icons/react/ssr';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { ScrollArea } from '@/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { LIBRARIES, matchesQuery } from '@/ui/icon-picker';
import { cn } from '@/helpers/utils';

const MAX_RESULTS = 120;

const iconKey = icon => `${icon.library}:${icon.name}`;

// Not a popover trigger like IconPicker itself — this is the content that
// goes *inside* one (TagDialog's related-icons field) or renders as a full
// page section (admin/suggested-icons/page.js). Selecting an icon toggles it
// in/out of `value` instead of closing anything.
const IconMultiGrid = ({ library, query, value, onToggle }) => {
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q ? library.icons.filter(icon => matchesQuery(icon, q)) : library.icons;
        return filtered.slice(0, MAX_RESULTS);
    }, [library, query]);

    if (results.length === 0) {
        return <p className='p-4 text-center text-sm text-muted-foreground'>Sin resultados.</p>;
    }

    return (
        <div className='grid grid-cols-8 gap-1 p-1' data-block='IconMultiGrid'>
            {results.map(icon => {
                const key = iconKey({ library: library.value, name: icon.name });
                const isSelected = value.some(entry => iconKey(entry) === key);
                return (
                    <Tooltip key={icon.name}>
                        <TooltipTrigger
                            render={
                                <button
                                    type='button'
                                    aria-label={icon.name}
                                    onClick={() =>
                                        onToggle({ library: library.value, name: icon.name })
                                    }
                                    className={cn(
                                        'relative flex size-10 items-center justify-center rounded-md text-foreground bg-muted/30 hover:bg-muted hover:scale-125 [&_svg]:size-5 transition-all',
                                        isSelected && 'bg-primary/15 text-primary ring-1 ring-primary/40',
                                    )}
                                />
                            }
                        >
                            <DynamicIcon icon={{ library: library.value, name: icon.name }} />
                            {isSelected && (
                                <CheckIcon className='absolute -top-1 -right-1 size-3.5 rounded-full bg-primary p-0.5 text-primary-foreground' />
                            )}
                        </TooltipTrigger>
                        <TooltipContent className='flex flex-col items-center gap-0.5 text-center'>
                            <span>{icon.name}</span>
                            {icon.tags.length > 0 && (
                                <span className='text-[10px] text-background/70'>
                                    {icon.tags.join(', ')}
                                </span>
                            )}
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
};

export const IconMultiSelect = ({ value = [], onChange }) => {
    const [library, setLibrary] = useState('phosphor');
    const [query, setQuery] = useState('');

    const toggle = icon => {
        const key = iconKey(icon);
        const exists = value.some(entry => iconKey(entry) === key);
        onChange(exists ? value.filter(entry => iconKey(entry) !== key) : [...value, icon]);
    };

    return (
        <div className='flex flex-col gap-2' data-block='IconMultiSelect'>
            <div
                className='flex flex-col gap-1 rounded-lg border border-dashed bg-muted/30 p-3'
                data-block='IconMultiSelectPreview'
            >
                <span className='text-xs text-muted-foreground'>
                    {value.length === 0
                        ? 'Sin íconos seleccionados'
                        : `${value.length} ${value.length === 1 ? 'ícono seleccionado' : 'íconos seleccionados'}`}
                </span>
                {value.length > 0 && (
                    <div className='flex flex-wrap gap-1.5'>
                        {value.map(icon => (
                            <Tooltip key={iconKey(icon)}>
                                <TooltipTrigger
                                    render={
                                        <button
                                            type='button'
                                            aria-label={`Quitar ${icon.name}`}
                                            onClick={() => toggle(icon)}
                                            className='flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary hover:bg-primary/25 [&_svg]:size-4'
                                        />
                                    }
                                >
                                    <DynamicIcon icon={icon} />
                                </TooltipTrigger>
                                <TooltipContent>{icon.name}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )}
            </div>

            <InputGroup>
                <InputGroupAddon>
                    <MagnifyingGlassIcon />
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder='Buscar ícono'
                />
            </InputGroup>

            <Tabs value={library} onValueChange={setLibrary}>
                <TabsList className='w-full'>
                    {LIBRARIES.map(lib => (
                        <TabsTrigger key={lib.value} value={lib.value}>
                            {lib.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {LIBRARIES.map(lib => (
                    <TabsContent key={lib.value} value={lib.value}>
                        <div className='h-[fit-content(14rem)] max-h-78'>
                            <ScrollArea className='size-full overflow-auto'>
                                <IconMultiGrid
                                    library={lib}
                                    query={query}
                                    value={value}
                                    onToggle={toggle}
                                />
                            </ScrollArea>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};
