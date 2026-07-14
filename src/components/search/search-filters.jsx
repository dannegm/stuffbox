'use client';

import { useQuery } from '@tanstack/react-query';
import { FunnelIcon, HouseIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { MultiSelectFilter } from '@/components/search/multi-select-filter';
import { SearchTagFilter } from '@/components/search/search-tag-filter';
import { locationChildrenQuery } from '@/queries/locations';
import { getLocationIcon } from '@/helpers/location';
import {
    DEFAULT_LOCATION_ICONS,
    FALLBACK_LOCATION_ICON,
    LOCATION_TYPE_PRESETS,
} from '@/constants/location-icons';

// Multi-select like tags — no "sin filtro" is a real option, it's just the
// empty-selection state, so the placeholder text itself ("Todos los tipos"/
// "Todas las casas") is what reads as the default rather than a selectable
// item in the list.
const TYPE_OPTIONS = LOCATION_TYPE_PRESETS.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: DEFAULT_LOCATION_ICONS[type] ?? FALLBACK_LOCATION_ICON,
}));

// `packed` is a boolean|null tri-state, tabs give it a string key since Tabs
// doesn't take null/boolean values directly.
const PACKED_TABS = {
    all: null,
    packed: true,
    loose: false,
};
const packedToTab = packed => (packed === true ? 'packed' : packed === false ? 'loose' : 'all');

// 2 columns on mobile (symmetric 2x2), 3 on larger screens (the 4th filter
// wraps to its own row) — a plain grid instead of ad-hoc per-filter widths,
// so wrapping is handled by the layout rather than tuned by hand per filter.
// Type/casa are multi-select (checkbox popovers), same as tags — they only
// narrow locations (search_workspace excludes items entirely when a type or
// tag filter is active, since items have no type and locations have no
// tags — see the RPC).
export const SearchFilters = ({
    workspaceId,
    tagIds,
    onTagIdsChange,
    typeIds,
    onTypeIdsChange,
    packed,
    onPackedChange,
    houseIds,
    onHouseIdsChange,
}) => {
    const { data: houses = [] } = useQuery(
        locationChildrenQuery({ workspaceId, parentId: null }, { enabled: !!workspaceId }),
    );

    const houseOptions = houses.map(house => ({
        value: house.id,
        label: house.name,
        location: house,
    }));

    return (
        <div className='flex flex-col gap-2' data-block='SearchFilters'>
            <div className='grid grid-cols-3 gap-2'>
                <SearchTagFilter
                    workspaceId={workspaceId}
                    value={tagIds}
                    onChange={onTagIdsChange}
                />

                <MultiSelectFilter
                    icon={FunnelIcon}
                    options={TYPE_OPTIONS}
                    value={typeIds}
                    onChange={onTypeIdsChange}
                    placeholder='Todos los tipos'
                    searchPlaceholder='Buscar tipo'
                    countLabel={count => `${count} tipos`}
                    renderOption={option => (
                        <>
                            <DynamicIcon icon={option.icon} />
                            <span className='truncate'>{option.label}</span>
                        </>
                    )}
                />

                <MultiSelectFilter
                    icon={HouseIcon}
                    options={houseOptions}
                    value={houseIds}
                    onChange={onHouseIdsChange}
                    placeholder='Todas las casas'
                    searchPlaceholder='Buscar casa'
                    countLabel={count => `${count} casas`}
                    renderOption={option => (
                        <>
                            <DynamicIcon icon={getLocationIcon(option.location)} />
                            <span className='truncate'>{option.label}</span>
                        </>
                    )}
                />
            </div>

            <Tabs
                value={packedToTab(packed)}
                onValueChange={tab => onPackedChange(PACKED_TABS[tab])}
                className='col-span-2 sm:col-span-1'
            >
                <TabsList className='h-9 w-full'>
                    <TabsTrigger value='all' className='flex-1'>
                        Todos
                    </TabsTrigger>
                    <TabsTrigger value='packed' className='flex-1'>
                        Empacado
                    </TabsTrigger>
                    <TabsTrigger value='loose' className='flex-1'>
                        Suelto
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
};
