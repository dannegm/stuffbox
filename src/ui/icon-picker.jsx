'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { ScrollArea } from '@/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { PHOSPHOR_ICONS } from '@/constants/phosphor-icons';
import { HUGE_ICONS } from '@/constants/huge-icons';
import { LUCIDE_ICONS } from '@/constants/lucide-icons';
import { LUCIDE_LAB_ICONS } from '@/constants/lucide-lab-icons';

// Every library DynamicIcon can resolve, searchable in one place. Ported
// from pinia's lucide-only icon-picker.jsx — huge/phosphor have no upstream
// tag metadata (unlike lucide-static's tags.json), so search on those two
// falls back to matching just the icon name.
const LIBRARIES = [
    { value: 'phosphor', label: 'Phosphor', icons: PHOSPHOR_ICONS },
    { value: 'huge', label: 'Hugeicons', icons: HUGE_ICONS },
    { value: 'lucide', label: 'Lucide', icons: LUCIDE_ICONS },
    { value: 'lucide-lab', label: 'Lucide Lab', icons: LUCIDE_LAB_ICONS },
];

const MAX_RESULTS = 120;

const matchesQuery = (icon, q) =>
    icon.name.toLowerCase().includes(q) || icon.tags.some(tag => tag.includes(q));

const iconKey = icon => `${icon.library}:${icon.name}`;

const SuggestedIcons = ({ icons, onSelect }) => (
    <div className='flex flex-col gap-1 border-b pb-2' data-block='SuggestedIcons'>
        <span className='px-1 text-xs text-muted-foreground'>Sugeridos por tus tags</span>
        <div className='flex flex-wrap gap-1 px-1'>
            {icons.map(icon => (
                <Tooltip key={iconKey(icon)}>
                    <TooltipTrigger
                        render={
                            <button
                                type='button'
                                aria-label={icon.name}
                                onClick={() => onSelect(icon)}
                                className='flex size-9 items-center justify-center rounded-md text-foreground bg-muted/30 hover:bg-muted hover:scale-125 [&_svg]:size-4 transition-all'
                            />
                        }
                    >
                        <DynamicIcon icon={icon} />
                    </TooltipTrigger>
                    <TooltipContent>{icon.name}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    </div>
);

const IconGrid = ({ library, query, onSelect }) => {
    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q ? library.icons.filter(icon => matchesQuery(icon, q)) : library.icons;
        return filtered.slice(0, MAX_RESULTS);
    }, [library, query]);

    if (results.length === 0) {
        return <p className='p-4 text-center text-sm text-muted-foreground'>Sin resultados.</p>;
    }

    return (
        <div className='grid grid-cols-8 gap-1 p-1'>
            {results.map(icon => (
                <Tooltip key={icon.name}>
                    <TooltipTrigger
                        render={
                            <button
                                type='button'
                                aria-label={icon.name}
                                onClick={() =>
                                    onSelect({ library: library.value, name: icon.name })
                                }
                                className='flex size-10 items-center justify-center rounded-md text-foreground bg-muted/30 hover:bg-muted hover:scale-150 [&_svg]:size-5 transition-all'
                            />
                        }
                    >
                        <DynamicIcon icon={{ library: library.value, name: icon.name }} />
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
            ))}
        </div>
    );
};

export const IconPicker = ({ value, onChange, children, suggestedIcons = [], align = 'start' }) => {
    const [open, setOpen] = useState(false);
    const [library, setLibrary] = useState(value?.library ?? 'phosphor');
    const [query, setQuery] = useState('');

    const handleSelect = icon => {
        onChange?.(icon);
        setOpen(false);
    };

    const uniqueSuggestions = useMemo(() => {
        const seen = new Set();
        return suggestedIcons.filter(icon => {
            const key = iconKey(icon);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [suggestedIcons]);

    return (
        <ResponsivePopover open={open} onOpenChange={setOpen}>
            <ResponsivePopoverTrigger render={children} />
            <ResponsivePopoverContent
                className='w-96 gap-2 p-2'
                data-block='IconPicker'
                align={align}
            >
                {uniqueSuggestions.length > 0 && !query.trim() && (
                    <SuggestedIcons icons={uniqueSuggestions} onSelect={handleSelect} />
                )}
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
                            <ScrollArea className='h-[fit-content(16rem)] max-h-96 overflow-auto'>
                                <IconGrid library={lib} query={query} onSelect={handleSelect} />
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
