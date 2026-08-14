'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import {
    TrashIcon,
    ArrowsLeftRightIcon,
    PackageIcon,
    PrinterIcon,
    ArrowRightIcon,
    TruckIcon,
    AirplaneIcon,
    DotsThreeVerticalIcon,
    PencilSimpleIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
} from '@phosphor-icons/react/ssr';
import { usePageTitle } from '@/hooks/use-page-title';
import {
    moveQuery,
    moveTotalValueQuery,
    updateMoveMutation,
    deleteMoveMutation,
    packedInMoveQuery,
} from '@/queries/moves';
import { workspaceQuery } from '@/queries/workspaces';
import { unpackItemMutation } from '@/queries/items';
import { unpackLocationMutation } from '@/queries/locations';
import { MoveRouteMap } from '@/components/moves/move-route-map';
import { MoveSummary } from '@/components/moves/move-summary';
import { MoveEditDialog } from '@/components/moves/move-edit-dialog';
import { MoveDatesDialog } from '@/components/moves/move-dates-dialog';
import { LocationPicker } from '@/components/locations/location-picker';
import { MultiSelectFilter } from '@/components/search/multi-select-filter';
import { SearchTagFilter } from '@/components/search/search-tag-filter';
import { SortMenuButton } from '@/components/search/sort-menu-button';
import { SelectSearch } from '@/ui/select-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { getItemIcon } from '@/helpers/item';
import { SORT_FIELDS, sortEntities } from '@/helpers/sort';
import { useConfirm } from '@/hooks/use-confirm';
import { useSettings } from '@/hooks/use-settings';
import { defaultSettings } from '@/constants/default-settings';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';
import {
    DEFAULT_LOCATION_ICONS,
    FALLBACK_LOCATION_ICON,
    LOCATION_TYPE_PRESETS,
} from '@/constants/location-icons';
import { MOVE_STATUSES } from '@/constants/move-status';

// Same shortlist as LocationPage/SearchFilters — locations.type is free
// text, this is a curated shortlist, not an enum.
const TYPE_OPTIONS = LOCATION_TYPE_PRESETS.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: DEFAULT_LOCATION_ICONS[type] ?? FALLBACK_LOCATION_ICON,
}));

// Subset of the app-wide SORT_FIELDS — packedInMoveQuery only fetches
// `name`/`created_at`, not the child counts/price rollups/ratings that
// 'count'/'price'/'likes' need on location/[id], so those don't apply here.
const PACKED_SORT_FIELDS = SORT_FIELDS.filter(
    field => field.value === 'name' || field.value === 'created_at',
);

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='MoveLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
        </div>
    </div>
);

export default function MovePage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [unpackTarget, setUnpackTarget] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [datesOpen, setDatesOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState([]);
    const [tagFilter, setTagFilter] = useState([]);
    const [packedTabSetting, setPackedTab] = useSettings('moveMobileTab', null);
    const [locationSort, setLocationSort] = useSettings(
        'moveLocationSort',
        defaultSettings.moveLocationSort,
    );
    const [itemSort, setItemSort] = useSettings('moveItemSort', defaultSettings.moveItemSort);

    const { data: move, isPending: isMovePending } = useQuery(moveQuery(id));
    const { data: packed, isPending: isPackedPending } = useQuery(packedInMoveQuery(id));
    const { data: totalValue, isPending: isTotalValuePending } = useQuery(
        moveTotalValueQuery(id, { enabled: !!move }),
    );
    const { data: workspace } = useQuery(
        workspaceQuery(move?.workspace_id, { enabled: !!move }),
    );
    usePageTitle([move?.name, workspace?.name]);

    const invalidatePacked = () => queryClient.invalidateQueries({ queryKey: ['move-packed', id] });

    const { mutate: updateMove } = useMutation(
        updateMoveMutation({
            onSuccess: updated => queryClient.setQueryData(['move', id], updated),
        }),
    );

    const { mutate: destroyMove, isPending: isDeleting } = useMutation(
        deleteMoveMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['moves', move?.workspace_id] });
                router.replace('/moves');
            },
        }),
    );

    const { mutate: unpackItem } = useMutation(unpackItemMutation({ onSuccess: invalidatePacked }));
    const { mutate: unpackLocation } = useMutation(
        unpackLocationMutation({ onSuccess: invalidatePacked }),
    );

    // Entering in_transit for the first time asks for the start/deadline
    // dates via MoveDatesDialog (which sets status itself on submit) — once
    // started_at exists, later re-entries skip the prompt and keep the
    // original dates. Completing a move auto-stamps completed_at with today.
    const handleStatusChange = status => {
        if (status === 'in_transit' && !move?.started_at) {
            setDatesOpen(true);
            return;
        }
        if (status === 'done') {
            updateMove({ id, status, completedAt: new Date().toISOString().slice(0, 10) });
            return;
        }
        updateMove({ id, status });
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: `¿Eliminar la mudanza "${move?.name}"?`,
            description: 'Se desempaca todo lo suelto.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: move?.name || 'eliminar',
        });
        if (!ok) return;
        destroyMove(id);
    };

    const handleUnpack = destinationId => {
        if (unpackTarget?.type === 'item') {
            unpackItem({ id: unpackTarget.id, locationId: destinationId });
        } else {
            unpackLocation({ id: unpackTarget?.id, parentId: destinationId });
        }
        setUnpackTarget(null);
    };

    if (isMovePending || !move || isPackedPending || !packed) {
        return <Loading />;
    }

    const hasRoute = move.origin?.lat != null && move.destination?.lat != null;
    const isEmpty = packed.items.length === 0 && packed.locations.length === 0;
    const packedTab = packedTabSetting ?? (packed.locations.length > 0 ? 'locations' : 'items');

    // A location can end up explicitly packed while nested inside another
    // packed location (e.g. a small box packed on its own, then the bigger
    // box it lives in gets packed later too) — both get their own row here,
    // but the nested one is already implied by its packed parent, so only
    // the top-most packed location per subtree is worth showing. Walking
    // just the direct parent_id against this same packed set is enough even
    // for deeper chains: a location three levels deep still gets hidden
    // because its immediate parent is itself packed (and therefore in the
    // set), regardless of whether that parent is shown or hidden in turn.
    const packedLocationIds = new Set(packed.locations.map(location => location.id));
    const topLevelPackedLocations = packed.locations.filter(
        location => !packedLocationIds.has(location.parent_id),
    );

    // Filters what's already loaded via Fuse, no refetch — same shape as
    // LocationPage's search/type/tag filters (types apply to locations only,
    // tags apply to items only).
    const filteredLocations = topLevelPackedLocations.filter(
        location => typeFilter.length === 0 || typeFilter.includes(location.type),
    );
    const filteredItems = packed.items.filter(
        item =>
            tagFilter.length === 0 ||
            item.item_tags.some(itemTag => tagFilter.includes(itemTag.tags.id)),
    );
    const locationFuse = new Fuse(filteredLocations, { keys: ['name', 'type'], threshold: 0.3 });
    const itemFuse = new Fuse(filteredItems, {
        keys: ['name', 'item_tags.tags.name'],
        threshold: 0.3,
    });
    const matchedLocations = locationSearch.trim()
        ? locationFuse.search(locationSearch.trim()).map(result => result.item)
        : filteredLocations;
    const matchedItems = itemSearch.trim()
        ? itemFuse.search(itemSearch.trim()).map(result => result.item)
        : filteredItems;

    const getLocationSortValue = location =>
        locationSort.field === 'created_at' ? new Date(location.created_at).getTime() : location.name;
    const getItemSortValue = item =>
        itemSort.field === 'created_at' ? new Date(item.created_at).getTime() : item.name;

    const searchedLocations = sortEntities(
        matchedLocations,
        locationSort.field,
        locationSort.direction,
        getLocationSortValue,
    );
    const searchedItems = sortEntities(matchedItems, itemSort.field, itemSort.direction, getItemSortValue);

    return (
        <div className='absolute inset-0 flex flex-col overflow-hidden p-4' data-block='MovePage'>
            {/* `-m-4` cancels this page's own p-4 so the ScrollArea's Root
            (nav bars, scrollbar thumb) reaches the true screen edges instead
            of floating inset with dead space around it; the p-4 moves onto
            the inner content div so the actual content keeps the same visual
            margin as before — same pattern as /search and /tags. */}
            <ScrollArea nav className='-m-4 min-h-0 flex-1'>
                <div
                    className='mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-16'
                    data-block='MovePageContent'
                >
                    <div
                        className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                        data-block='MoveHero'
                    >
                        <div className='flex items-center justify-between gap-2'>
                            <div className='flex min-w-0 items-center gap-3'>
                                <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-flourish shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5'>
                                    {move.route_type === 'air' ? <AirplaneIcon /> : <TruckIcon />}
                                </span>
                                <div className='min-w-0 flex-1'>
                                    <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                                        {move.name}
                                    </h1>
                                    <p className='flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
                                        <span className='truncate'>{move.origin?.name}</span>
                                        <ArrowRightIcon className='size-3 shrink-0' />
                                        <span className='truncate'>{move.destination?.name}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='h-1 bg-muted/50' />

                        <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
                            {!isEmpty && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    render={<Link href={`/move/${id}/labels`} />}
                                >
                                    <PrinterIcon data-icon='inline-start' />
                                    Etiquetas
                                </Button>
                            )}
                            <SelectSearch
                                options={MOVE_STATUSES}
                                value={move.status}
                                onChange={handleStatusChange}
                                getKey={option => option.value}
                                getLabel={option => option.label}
                                triggerClassName='w-auto'
                            />

                            <div className='flex flex-1' />

                            <ResponsiveDropdownMenu>
                                <ResponsiveDropdownMenuTrigger
                                    render={<Button size='icon-sm' variant='outline' />}
                                >
                                    <DotsThreeVerticalIcon />
                                </ResponsiveDropdownMenuTrigger>
                                <ResponsiveDropdownMenuContent align='end'>
                                    <ResponsiveDropdownMenuItem onClick={() => setEditOpen(true)}>
                                        <PencilSimpleIcon />
                                        Editar
                                    </ResponsiveDropdownMenuItem>
                                    <ResponsiveDropdownMenuItem
                                        variant='destructive'
                                        disabled={isDeleting}
                                        onClick={handleDelete}
                                    >
                                        <TrashIcon />
                                        Eliminar
                                    </ResponsiveDropdownMenuItem>
                                </ResponsiveDropdownMenuContent>
                            </ResponsiveDropdownMenu>
                        </div>
                    </div>

                    <MoveSummary
                        move={move}
                        packed={packed}
                        totalValue={totalValue}
                        isTotalValuePending={isTotalValuePending}
                    />

                    <MoveEditDialog
                        move={move}
                        workspaceId={move.workspace_id}
                        open={editOpen}
                        onOpenChange={setEditOpen}
                    />

                    <MoveDatesDialog move={move} open={datesOpen} onOpenChange={setDatesOpen} />

                    {hasRoute ? (
                        <MoveRouteMap
                            origin={move.origin}
                            destination={move.destination}
                            routeType={move.route_type}
                            status={move.status}
                        />
                    ) : (
                        <p className='rounded-lg border p-3 text-sm text-muted-foreground'>
                            Ponle ubicación (lat/lng) a{' '}
                            {move.origin?.lat == null ? move.origin?.name : move.destination?.name}{' '}
                            para ver la ruta en el mapa.
                        </p>
                    )}

                    <LocationPicker
                        open={!!unpackTarget}
                        onOpenChange={next => !next && setUnpackTarget(null)}
                        workspaceId={move.workspace_id}
                        onSelect={handleUnpack}
                    />

                    {isEmpty ? (
                        <Empty className='flex-1' data-block='MovePackedEmpty'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon' className='bg-flourish/15 text-flourish'>
                                    <PackageIcon />
                                </EmptyMedia>
                                <EmptyTitle>Nada empacado todavía</EmptyTitle>
                                <EmptyDescription>
                                    Abre un item o una caja y usa "Empacar" para agregarlo aquí.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            <Tabs value={packedTab} onValueChange={setPackedTab}>
                                <TabsList className='w-full'>
                                    <TabsTrigger value='locations'>Cajas</TabsTrigger>
                                    <TabsTrigger value='items'>Muebles</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {packedTab === 'locations' ? (
                                <div className='flex flex-col gap-2'>
                                    <div className='flex items-center gap-2'>
                                        <InputGroup className='flex-1'>
                                            <InputGroupAddon>
                                                <MagnifyingGlassIcon />
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                value={locationSearch}
                                                onChange={event =>
                                                    setLocationSearch(event.target.value)
                                                }
                                                placeholder='Filtrar cajas…'
                                            />
                                        </InputGroup>
                                        <MultiSelectFilter
                                            className='w-36 shrink-0'
                                            icon={FunnelIcon}
                                            options={TYPE_OPTIONS}
                                            value={typeFilter}
                                            onChange={setTypeFilter}
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
                                        <SortMenuButton
                                            sort={locationSort}
                                            onSortChange={setLocationSort}
                                            fields={PACKED_SORT_FIELDS}
                                        />
                                    </div>
                                    {packed.locations.length === 0 ? (
                                        <p className='rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground'>
                                            Nada empacado en cajas todavía.
                                        </p>
                                    ) : searchedLocations.length > 0 ? (
                                        <div className='flex flex-col gap-2'>
                                            {searchedLocations.map(location => (
                                                <div
                                                    key={location.id}
                                                    className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40'
                                                >
                                                    <Link
                                                        href={`/location/${location.id}`}
                                                        className='flex min-w-0 flex-1 items-center gap-3 hover:underline'
                                                    >
                                                        <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                                            <DynamicIcon
                                                                icon={getLocationIcon(location)}
                                                            />
                                                        </span>
                                                        <span className='min-w-0 flex-1 truncate font-medium'>
                                                            {location.name}
                                                        </span>
                                                    </Link>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() =>
                                                            setUnpackTarget({
                                                                type: 'location',
                                                                id: location.id,
                                                            })
                                                        }
                                                    >
                                                        <ArrowsLeftRightIcon data-icon='inline-start' />
                                                        Desempacar
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className='rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground'>
                                            Sin resultados.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className='flex flex-col gap-2'>
                                    <div className='flex items-center gap-2'>
                                        <InputGroup className='flex-1'>
                                            <InputGroupAddon>
                                                <MagnifyingGlassIcon />
                                            </InputGroupAddon>
                                            <InputGroupInput
                                                value={itemSearch}
                                                onChange={event =>
                                                    setItemSearch(event.target.value)
                                                }
                                                placeholder='Filtrar muebles…'
                                            />
                                        </InputGroup>
                                        <SearchTagFilter
                                            className='w-36 shrink-0'
                                            workspaceId={move.workspace_id}
                                            value={tagFilter}
                                            onChange={setTagFilter}
                                        />
                                        <SortMenuButton
                                            sort={itemSort}
                                            onSortChange={setItemSort}
                                            fields={PACKED_SORT_FIELDS}
                                        />
                                    </div>
                                    {packed.items.length === 0 ? (
                                        <p className='rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground'>
                                            Nada empacado en muebles todavía.
                                        </p>
                                    ) : searchedItems.length > 0 ? (
                                        <div className='flex flex-col gap-2'>
                                            {searchedItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40'
                                                >
                                                    <Link
                                                        href={`/item/${item.id}`}
                                                        className='flex min-w-0 flex-1 items-center gap-3 hover:underline'
                                                    >
                                                        <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                                            <DynamicIcon icon={getItemIcon(item)} />
                                                        </span>
                                                        <span className='min-w-0 flex-1 truncate font-medium'>
                                                            {item.name}
                                                        </span>
                                                    </Link>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() =>
                                                            setUnpackTarget({
                                                                type: 'item',
                                                                id: item.id,
                                                            })
                                                        }
                                                    >
                                                        <ArrowsLeftRightIcon data-icon='inline-start' />
                                                        Desempacar
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className='rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground'>
                                            Sin resultados.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
