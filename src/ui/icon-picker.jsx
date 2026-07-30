'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { cache } from '@/services/cache';
import { appSettingQuery, SUGGESTED_ICONS_KEY } from '@/queries/app-settings';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/helpers/utils';

// Every library DynamicIcon can resolve, searchable in one place. Ported
// from pinia's lucide-only icon-picker.jsx — huge/phosphor have no upstream
// tag metadata (unlike lucide-static's tags.json), so search on those two
// falls back to matching just the icon name. Exported so the admin
// suggested-icons multi-select (src/components/admin/icon-multi-select.jsx)
// can reuse the exact same library list and match logic.
export const LIBRARIES = [
    { value: 'phosphor', label: 'Phosphor', icons: PHOSPHOR_ICONS },
    { value: 'huge', label: 'Hugeicons', icons: HUGE_ICONS },
    { value: 'lucide', label: 'Lucide', icons: LUCIDE_ICONS },
    { value: 'lucide-lab', label: 'Lucide Lab', icons: LUCIDE_LAB_ICONS },
];

const MAX_RESULTS = 120;

export const matchesQuery = (icon, q) =>
    icon.name.toLowerCase().includes(q) || icon.tags.some(tag => tag.includes(q));

const iconKey = icon => `${icon.library}:${icon.name}`;

// Frequency map ({ "library:name": count }), local to this device — not
// meant to sync across tabs (cache.js over settings.js), just a same-tab,
// best-effort nudge so icons the user actually reaches for keep surfacing.
const ICON_USAGE_CACHE_KEY = 'iconUsage';
const MAX_FREQUENT_ICONS = 12;

const recordIconUsage = icon => {
    const usage = cache.get(ICON_USAGE_CACHE_KEY, {});
    const key = iconKey(icon);
    cache.set(ICON_USAGE_CACHE_KEY, { ...usage, [key]: (usage[key] ?? 0) + 1 });
};

const getFrequentIcons = () => {
    const usage = cache.get(ICON_USAGE_CACHE_KEY, {});
    return Object.entries(usage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_FREQUENT_ICONS)
        .map(([key]) => {
            const [library, ...nameParts] = key.split(':');
            return { library, name: nameParts.join(':') };
        });
};

const SuggestedIcons = ({ icons, label, onSelect }) => (
    <div className='flex flex-col gap-1 border-b pb-2' data-block='SuggestedIcons'>
        <span className='px-1 text-xs text-muted-foreground'>{label}</span>
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
    const [frequentIcons, setFrequentIcons] = useState([]);
    const isMobile = useIsMobile();
    // On mobile the suggested-icons row stays put while typing instead of
    // unmounting — it isn't wrapped in a fixed-height box like the grid
    // below it, so hiding it on query would still shrink the drawer.
    const showSuggestions = isMobile || !query.trim();

    // Admin-curated list (managed from /admin/suggested-icons), shared across
    // every IconPicker instance regardless of context.
    const { data: curatedIcons = [] } = useQuery(
        appSettingQuery(SUGGESTED_ICONS_KEY, { enabled: open }),
    );

    // Re-read on every open (not just on mount) since usage recorded by
    // other IconPicker instances on the same page — or an earlier open of
    // this same one — should show up without a full remount.
    useEffect(() => {
        if (open) setFrequentIcons(getFrequentIcons());
    }, [open]);

    const handleSelect = icon => {
        recordIconUsage(icon);
        onChange?.(icon);
        setOpen(false);
    };

    const uniqueSuggestions = useMemo(() => {
        const seen = new Set();
        return [...suggestedIcons, ...(curatedIcons ?? []), ...frequentIcons].filter(icon => {
            const key = iconKey(icon);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [suggestedIcons, curatedIcons, frequentIcons]);

    const suggestionsLabel =
        suggestedIcons.length > 0
            ? 'Sugeridos por tus tags'
            : curatedIcons?.length > 0
              ? 'Sugeridos'
              : 'Usados frecuentemente';

    return (
        <ResponsivePopover open={open} onOpenChange={setOpen}>
            <ResponsivePopoverTrigger render={children} />
            <ResponsivePopoverContent
                className='w-96 gap-2 p-2'
                data-block='IconPicker'
                align={align}
            >
                {uniqueSuggestions.length > 0 && showSuggestions && (
                    <SuggestedIcons
                        icons={uniqueSuggestions}
                        label={suggestionsLabel}
                        onSelect={handleSelect}
                    />
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
                            <div
                                className={cn({
                                    'h-64': isMobile,
                                    'h-[fit-content(16rem)] max-h-96': !isMobile,
                                })}
                            >
                                <ScrollArea className='size-full overflow-auto'>
                                    <IconGrid
                                        library={lib}
                                        query={query}
                                        onSelect={handleSelect}
                                    />
                                </ScrollArea>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
