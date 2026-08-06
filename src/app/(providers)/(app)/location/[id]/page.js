'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    pointerWithin,
} from '@dnd-kit/core';
import {
    PlusIcon,
    DotsThreeVerticalIcon,
    PencilSimpleIcon,
    PackageIcon,
    LeafIcon,
    TrashIcon,
    ArrowsLeftRightIcon,
    XIcon,
    ArrowUpIcon,
    CurrencyDollarIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ListIcon,
    SquaresFourIcon,
    EyeIcon,
} from '@phosphor-icons/react/ssr';

import {
    PackageIcon as LucidePackageIcon,
    PackageOpenIcon as LucidePackageOpenIcon,
} from 'lucide-react';

import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { workspaceQuery } from '@/queries/workspaces';
import {
    locationQuery,
    locationChildrenQuery,
    locationAncestorsQuery,
    deleteLocationMutation,
    transferLocationMutation,
    packLocationMutation,
    unpackLocationMutation,
    locationTotalPriceQuery,
    locationCountsQuery,
    getLocationDescendantIds,
} from '@/queries/locations';
import { itemsAtLocationQuery } from '@/queries/items';
import { bulkTransferMutation, bulkPackMutation, bulkUnpackMutation } from '@/queries/bulk';
import { moveQuery } from '@/queries/moves';
import { entityRatingsQuery } from '@/queries/entity-ratings';
import { RatingToggle } from '@/components/deck/rating-toggle';
import { getEntityRatingKey, groupRatingsByEntity } from '@/helpers/entity-ratings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/hooks/use-settings';
import { useMultiSelectKeyHeld } from '@/hooks/use-multi-select-key-held';
import { LocationListItem } from '@/components/locations/location-list-item';
import { LocationCardItem } from '@/components/locations/location-card-item';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { CreateLocationDialog } from '@/components/locations/create-location-dialog';
import { LocationPicker } from '@/components/locations/location-picker';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { PackedTapeTop } from '@/components/moves/packed-tape';
import { ItemListRow } from '@/components/items/item-list-row';
import { ItemCardItem } from '@/components/items/item-card-item';
import { MultiSelectFilter } from '@/components/search/multi-select-filter';
import { SearchTagFilter } from '@/components/search/search-tag-filter';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import {
    getLocationIcon,
    getFirstLocationPhoto,
    getLocationPhotoUrl,
    getLocationPhotos,
} from '@/helpers/location';
import {
    DEFAULT_LOCATION_ICONS,
    FALLBACK_LOCATION_ICON,
    FALLBACK_ITEM_ICON,
    LOCATION_TYPE_PRESETS,
} from '@/constants/location-icons';
import { cn } from '@/helpers/utils';
import { Button } from '@/ui/button';
import { Checkbox } from '@/ui/checkbox';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { ScrollToolbar } from '@/ui/scroll-toolbar';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from '@/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { ScrollArea } from '@/ui/scroll-area';
import { Separator } from '@/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';

// Same shortlist as SearchFilters (src/components/search/search-filters.jsx) —
// locations.type is free text, this is a curated shortlist, not an enum.
const TYPE_OPTIONS = LOCATION_TYPE_PRESETS.map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: DEFAULT_LOCATION_ICONS[type] ?? FALLBACK_LOCATION_ICON,
}));

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='LocationLoading'>
        <Skeleton className='h-6 w-2/3 rounded' />
        <Skeleton className='h-16 w-full rounded-xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
        </div>
    </div>
);

// Special drop zone (left column, desktop split view only): dropping an
// item/location here un-nests it — it becomes a sibling of the current
// location instead of a child, i.e. moves to this location's own parent.
// Never shown at a root (no parent to move to). A real component (not an
// inline hook call) since useDroppable can't be called conditionally.
const MOVE_OUT_TARGET = '__move_out__';

const MoveOutDropZone = ({ parentName }) => {
    const { setNodeRef, isOver } = useDroppable({ id: MOVE_OUT_TARGET });

    return (
        <div
            ref={setNodeRef}
            data-block='MoveOutDropZone'
            className={cn(
                'flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors',
                isOver && 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/40',
            )}
        >
            <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-4'>
                <ArrowUpIcon />
            </span>
            <span className='min-w-0 flex-1 truncate'>Sacar a {parentName ?? 'nivel anterior'}</span>
        </div>
    );
};

// DragOverlay content — a floating "what am I dragging" chip that follows
// the cursor, replacing native drag's default (often misaligned) ghost
// image. Shows the actual name for a single item/location, or a count when
// dragging a whole selection.
const DragPreview = ({ data }) => {
    const Icon = data.type === 'items' ? LeafIcon : PackageIcon;
    const label = data.label ?? `${data.ids.length} seleccionados`;

    return (
        <div className='flex max-w-56 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-lg shadow-black/10 ring-1 ring-foreground/10'>
            <Icon className='size-4 shrink-0 text-muted-foreground' />
            <span className='min-w-0 truncate font-medium'>{label}</span>
        </div>
    );
};

export default function LocationPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const confirm = useConfirm();
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [transferOpen, setTransferOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    // Holding Alt/Option acts as a momentary selection mode (not Cmd/Ctrl —
    // that's the browser's own open-in-new-tab click gesture) — released
    // items stay selected (via the `selected` prop on each row/card, applied
    // independently of `isSelecting` below) but can't be toggled again until
    // Alt (or the manual selection-mode button) is engaged again.
    const multiSelectKeyHeld = useMultiSelectKeyHeld();
    const isSelecting = selectionMode || multiSelectKeyHeld;
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [selectedLocationIds, setSelectedLocationIds] = useState(new Set());
    const [bulkPickerMode, setBulkPickerMode] = useState(null); // null | 'transfer' | 'unpack'
    const [bulkPackOpen, setBulkPackOpen] = useState(false);
    const [packFilter, setPackFilter] = useState('all'); // 'all' | 'packed' | 'unpacked'
    const [viewType, setViewType] = useSettings('locationViewType', 'list'); // 'list' | 'cards'
    const [locationSearch, setLocationSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState([]);
    const [tagFilter, setTagFilter] = useState([]);
    const [mobileViewSetting, setMobileView] = useSettings('locationMobileTab', null);
    const [activeDrag, setActiveDrag] = useState(null); // { type, ids, label } — for DragOverlay
    const isDesktop = !useIsMobile();
    const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: location, isPending: isLocationPending } = useQuery(
        locationQuery(id, { enabled: !!user }),
    );
    const { data: workspace } = useQuery(
        workspaceQuery(location?.workspace_id, { enabled: !!location }),
    );
    const { data: ancestors } = useQuery(locationAncestorsQuery(location?.parent_id));
    const { data: children, isPending: isChildrenPending } = useQuery(
        locationChildrenQuery(
            { workspaceId: location?.workspace_id, parentId: id },
            { enabled: !!location },
        ),
    );
    const { data: items, isPending: isItemsPending } = useQuery(
        itemsAtLocationQuery(id, { enabled: !!location }),
    );
    // Boxed locations/items inherit their nearest packed ancestor's move —
    // only the box that was actually packed has active_move_id set in the
    // DB, so anything nested inside it (any depth) is "packed" only by
    // walking up the ancestor chain, never by its own column.
    const packedAncestor = (ancestors ?? []).find(ancestor => ancestor.active_move_id);
    const packedMoveId = location?.active_move_id ?? packedAncestor?.active_move_id ?? null;
    const isLocationPacked = !!packedMoveId;
    const { data: packedMove } = useQuery(
        moveQuery(packedMoveId, { enabled: !!packedMoveId }),
    );
    // Recursive rollup of everything under this location, regardless of
    // is_item — that flag only gates the rate deck now (pack/unpack is
    // available on any non-root location), not the value stat (a house/room's
    // total is just as meaningful as a box's).
    const { data: totalPrice } = useQuery(locationTotalPriceQuery(id, { enabled: !!location }));
    const { data: childCounts } = useQuery(
        locationCountsQuery(children?.map(child => child.id) ?? [], {
            enabled: !!children?.length,
        }),
    );
    const { data: ratings } = useQuery(entityRatingsQuery(location?.workspace_id));
    const ratingsByEntity = groupRatingsByEntity(ratings ?? []);
    const getItemRatingCounts = itemId => {
        const key = getEntityRatingKey('item', itemId);
        return {
            likeCount: ratingsByEntity[key]?.likes.length ?? 0,
            dislikeCount: ratingsByEntity[key]?.dislikes.length ?? 0,
        };
    };
    // entityRatingsQuery already loads every rating in the workspace
    // (locations included) — no need for a second entityRatingsForEntityQuery
    // just for this location's own row.
    const locationRatings = (ratings ?? []).filter(
        rating => rating.entity_type === 'location' && rating.entity_id === id,
    );

    const { mutate: transfer, isPending: isTransferring } = useMutation(
        transferLocationMutation({
            onSuccess: updated => {
                const previousParentId = location?.parent_id;
                queryClient.setQueryData(['location', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['locations', updated.workspace_id, previousParentId],
                });
                queryClient.invalidateQueries({
                    queryKey: ['locations', updated.workspace_id, updated.parent_id],
                });
            },
        }),
    );

    const { mutate: pack } = useMutation(
        packLocationMutation({
            onSuccess: updated => queryClient.setQueryData(['location', id], updated),
        }),
    );

    const { mutate: unpack } = useMutation(
        unpackLocationMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['location', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['locations', updated.workspace_id, updated.parent_id],
                });
            },
        }),
    );

    // A location can nest locations, so (unlike items) transferring/unpacking
    // one can create a parent_id cycle if the destination is itself or one of
    // its own descendants — that would hang ancestor walks and the price RPC.
    const isDestinationSafe = async (destinationId, movingLocationIds) => {
        if (movingLocationIds.includes(destinationId)) return false;
        const descendantSets = await Promise.all(movingLocationIds.map(getLocationDescendantIds));
        return !descendantSets.some(set => set.includes(destinationId));
    };

    const handleTransfer = async newParentId => {
        if (!(await isDestinationSafe(newParentId, [id]))) {
            await confirm({
                title: 'No puedes mover esta ubicación dentro de sí misma o de algo que contiene.',
                cancelLabel: null,
                confirmLabel: 'Entendido',
            });
            return;
        }
        transfer({ id, parentId: newParentId });
    };

    const handlePack = moveId => pack({ id, moveId });

    const handleUnpack = async newParentId => {
        if (!(await isDestinationSafe(newParentId, [id]))) {
            await confirm({
                title: 'No puedes desempacar esta caja dentro de sí misma o de algo que contiene.',
                cancelLabel: null,
                confirmLabel: 'Entendido',
            });
            return;
        }
        unpack({ id, parentId: newParentId });
    };

    const toggleItemSelection = itemId =>
        setSelectedItemIds(current => {
            const next = new Set(current);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });

    const toggleLocationSelection = locationId =>
        setSelectedLocationIds(current => {
            const next = new Set(current);
            next.has(locationId) ? next.delete(locationId) : next.add(locationId);
            return next;
        });

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedItemIds(new Set());
        setSelectedLocationIds(new Set());
    };

    const invalidateListing = () => {
        queryClient.invalidateQueries({ queryKey: ['items', 'by-location', id] });
        queryClient.invalidateQueries({ queryKey: ['locations', location?.workspace_id, id] });
        queryClient.invalidateQueries({ queryKey: ['location-counts'] });
    };

    const { mutate: bulkTransfer } = useMutation(
        bulkTransferMutation({
            onSuccess: () => {
                invalidateListing();
                exitSelectionMode();
            },
        }),
    );
    const { mutate: bulkPack } = useMutation(
        bulkPackMutation({
            onSuccess: () => {
                invalidateListing();
                exitSelectionMode();
            },
        }),
    );
    const { mutate: bulkUnpack } = useMutation(
        bulkUnpackMutation({
            onSuccess: () => {
                invalidateListing();
                exitSelectionMode();
            },
        }),
    );

    const selectedCount = selectedItemIds.size + selectedLocationIds.size;

    const handleBulkPickerSelect = async destinationId => {
        const locationIds = [...selectedLocationIds];
        if (locationIds.length > 0 && !(await isDestinationSafe(destinationId, locationIds))) {
            await confirm({
                title: 'No puedes mover la selección dentro de sí misma o de algo que contiene.',
                cancelLabel: null,
                confirmLabel: 'Entendido',
            });
            setBulkPickerMode(null);
            return;
        }
        const payload = { itemIds: [...selectedItemIds], locationIds, destinationId };
        if (bulkPickerMode === 'transfer') bulkTransfer(payload);
        else if (bulkPickerMode === 'unpack') bulkUnpack(payload);
        setBulkPickerMode(null);
    };

    const handleBulkPack = moveId => {
        bulkPack({ itemIds: [...selectedItemIds], locationIds: [...selectedLocationIds], moveId });
        setBulkPackOpen(false);
    };

    // Desktop-only split view drag-and-drop (see ItemListRow/LocationListItem;
    // MOVE_OUT_TARGET/MoveOutDropZone above). Dragging a row that's part of
    // the active selection moves the whole selection; otherwise just that one
    // row — same convention as Finder. dnd-kit owns the actual drag mechanics
    // (pointer tracking, hit-testing, the DragOverlay) — this just supplies
    // the per-row payload and reacts to the final drop.
    const getItemDragData = draggedItem => {
        const ids =
            isSelecting && selectedItemIds.has(draggedItem.id)
                ? [...selectedItemIds]
                : [draggedItem.id];
        return { type: 'items', ids, label: ids.length === 1 ? draggedItem.name : null };
    };

    const getLocationDragData = draggedLocation => {
        const ids =
            isSelecting && selectedLocationIds.has(draggedLocation.id)
                ? [...selectedLocationIds]
                : [draggedLocation.id];
        return { type: 'locations', ids, label: ids.length === 1 ? draggedLocation.name : null };
    };

    const handleDragStart = event => setActiveDrag(event.active.data.current);

    const handleDragEnd = async event => {
        setActiveDrag(null);
        const { active, over } = event;
        if (!over) return;

        const { type, ids } = active.data.current;
        const destinationId = over.id === MOVE_OUT_TARGET ? location?.parent_id : over.id;
        if (!destinationId) return;

        if (type === 'items') {
            bulkTransfer({ itemIds: ids, locationIds: [], destinationId });
            return;
        }

        if (ids.includes(destinationId)) return;
        if (!(await isDestinationSafe(destinationId, ids))) {
            await confirm({
                title: 'No puedes soltar ahí — es la misma ubicación o algo que ya contiene.',
                cancelLabel: null,
                confirmLabel: 'Entendido',
            });
            return;
        }
        bulkTransfer({ itemIds: [], locationIds: ids, destinationId });
    };

    const { mutate: destroy } = useMutation(
        deleteLocationMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: ['locations', location?.workspace_id, location?.parent_id],
                });
                router.replace(
                    location?.parent_id
                        ? `/location/${location.parent_id}`
                        : `/workspace/${location?.workspace_id}`,
                );
            },
        }),
    );

    const handleDelete = async () => {
        const hasContents = children?.length || items?.length;
        const ok = await confirm({
            title: `¿Eliminar "${location?.name}"?`,
            description: hasContents
                ? `Tiene ${children?.length} ubicación(es) y ${items?.length} artículo(s) dentro. Se eliminará todo.`
                : 'Esto no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: location?.name,
        });
        if (!ok) return;
        destroy(id);
    };

    if (
        isAuthLoading ||
        !user ||
        isLocationPending ||
        !location ||
        !workspace ||
        isChildrenPending ||
        isItemsPending
    ) {
        return <Loading />;
    }

    const locationPhoto = getFirstLocationPhoto(location);
    const locationPhotoUrl = getLocationPhotoUrl(location);
    const locationPhotos = getLocationPhotos(location);
    const isEmpty = children.length === 0 && items.length === 0;
    // Default to the locations tab, unless there are none — then default to
    // items. Once the user taps a tab, that choice is saved to settings and
    // wins everywhere from then on (see locationMobileTab in
    // default-settings.js).
    const mobileView = mobileViewSetting ?? (children.length > 0 ? 'locations' : 'items');
    // Only the workspace owner can delete a house (a root location, no
    // parent) — collaborators can still delete anything nested inside one.
    const isOwner = workspace.owner_id === user.id;
    const canDeleteLocation = !!location.parent_id || isOwner;

    // Everything directly inside this location inherits its pack state (see
    // isLocationPacked above) — the child/item's own active_move_id still
    // wins when set, so a location individually packed while its own
    // container isn't stays correctly self-packed.
    const inheritedMoveId = isLocationPacked ? packedMoveId : null;
    const displayChildren = children.map(child => ({
        ...child,
        active_move_id: child.active_move_id ?? inheritedMoveId,
    }));
    const displayItems = items.map(item => ({
        ...item,
        active_move_id: item.active_move_id ?? inheritedMoveId,
    }));

    const matchesPackFilter = entity => {
        if (packFilter === 'packed') return !!entity.active_move_id;
        if (packFilter === 'unpacked') return !entity.active_move_id;
        return true;
    };
    const matchesTypeFilter = child =>
        typeFilter.length === 0 || typeFilter.includes(child.type);
    const matchesTagFilter = item =>
        tagFilter.length === 0 ||
        item.item_tags.some(itemTag => tagFilter.includes(itemTag.tags?.id));
    const filteredChildren = displayChildren.filter(matchesPackFilter).filter(matchesTypeFilter);
    const filteredItems = displayItems.filter(matchesPackFilter).filter(matchesTagFilter);

    // Filters what's already loaded via Fuse, no refetch. Locations search by
    // name/type, items by name/tag name.
    const locationFuse = new Fuse(filteredChildren, { keys: ['name', 'type'], threshold: 0.3 });
    const itemFuse = new Fuse(filteredItems, {
        keys: ['name', 'item_tags.tags.name'],
        threshold: 0.3,
    });
    const searchedChildren = locationSearch.trim()
        ? locationFuse.search(locationSearch.trim()).map(result => result.item)
        : filteredChildren;
    const searchedItems = itemSearch.trim()
        ? itemFuse.search(itemSearch.trim()).map(result => result.item)
        : filteredItems;
    const parentName = ancestors?.[ancestors.length - 1]?.name;

    // "Select all" targets whatever's currently visible (post search/filter),
    // matching what the user actually sees — not every child/item at this
    // location regardless of filters.
    const visibleLocationIds = searchedChildren.map(child => child.id);
    const visibleItemIds = searchedItems.map(item => item.id);
    const visibleSelectableCount = visibleLocationIds.length + visibleItemIds.length;
    const isAllSelected =
        visibleSelectableCount > 0 &&
        visibleLocationIds.every(childId => selectedLocationIds.has(childId)) &&
        visibleItemIds.every(itemId => selectedItemIds.has(itemId));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedLocationIds(new Set());
            setSelectedItemIds(new Set());
        } else {
            setSelectedLocationIds(new Set(visibleLocationIds));
            setSelectedItemIds(new Set(visibleItemIds));
        }
    };

    const mainContent = (
        <>
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
                currentIcon={getLocationIcon(location)}
            />

            <div
                className='relative flex items-center gap-3 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='LocationHero'
            >
                <span
                    className={cn(
                        'group relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card text-foreground shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5',
                        locationPhotoUrl && 'cursor-pointer',
                    )}
                    {...(locationPhotoUrl && {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': 'Ver foto',
                        onClick: () => setLightboxIndex(0),
                        onKeyDown: event => {
                            if (event.key === 'Enter' || event.key === ' ') setLightboxIndex(0);
                        },
                    })}
                >
                    {locationPhotoUrl ? (
                        <>
                            <CroppedPhoto src={locationPhotoUrl} photo={locationPhoto} />
                            <span className='absolute inset-0 z-1 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40 group-focus-visible:bg-black/40'>
                                <EyeIcon
                                    weight='fill'
                                    className='size-4 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
                                />
                            </span>
                        </>
                    ) : (
                        <DynamicIcon icon={getLocationIcon(location)} />
                    )}
                </span>

                <div className='min-w-0'>
                    <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                        {location.name}
                    </h1>
                    <div className='flex items-center gap-1.5'>
                        <p className='truncate text-xs text-muted-foreground capitalize'>
                            {location.type}
                        </p>
                        {location.is_item && (
                            <span className='flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary [&_svg]:size-3'>
                                <LeafIcon />
                                Item
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <ScrollToolbar
                data-block='LocationToolbar'
                start={
                    isSelecting ? (
                        <Button size='icon-sm' variant='outline' onClick={exitSelectionMode}>
                            <XIcon />
                        </Button>
                    ) : (
                        !isEmpty && (
                            <Button size='icon-sm' variant='outline' onClick={() => setSelectionMode(true)}>
                                <Checkbox checked={true} tabIndex={-1} className='pointer-events-none' />
                            </Button>
                        )
                    )
                }
                end={
                    !isSelecting &&
                    canDeleteLocation && (
                        <ResponsiveDropdownMenu>
                            <ResponsiveDropdownMenuTrigger
                                render={<Button size='icon-sm' variant='outline' />}
                            >
                                <DotsThreeVerticalIcon />
                            </ResponsiveDropdownMenuTrigger>
                            <ResponsiveDropdownMenuContent align='end'>
                                <ResponsiveDropdownMenuItem
                                    variant='destructive'
                                    onClick={handleDelete}
                                >
                                    <TrashIcon />
                                    Eliminar
                                </ResponsiveDropdownMenuItem>
                            </ResponsiveDropdownMenuContent>
                        </ResponsiveDropdownMenu>
                    )
                }
            >
                {isSelecting ? (
                    <>
                        <span className='shrink-0 px-1 text-sm text-muted-foreground'>
                            {selectedCount} sel.
                        </span>

                        <Button
                            size='sm'
                            variant='outline'
                            disabled={visibleSelectableCount === 0}
                            onClick={toggleSelectAll}
                        >
                            <Checkbox
                                checked={isAllSelected}
                                tabIndex={-1}
                                className='pointer-events-none'
                            />
                            <span className='hidden sm:inline'>
                                {isAllSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                            </span>
                        </Button>

                        <Button
                            size='sm'
                            variant='outline'
                            disabled={selectedCount === 0}
                            onClick={() => setBulkPickerMode('transfer')}
                        >
                            <ArrowsLeftRightIcon />
                            Transferir
                        </Button>

                        <Button
                            size='sm'
                            variant='outline'
                            disabled={selectedCount === 0}
                            onClick={() => setBulkPackOpen(true)}
                        >
                            <LucidePackageIcon className='stroke-1' />
                            <span className='hidden sm:inline'>Empacar</span>
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            disabled={selectedCount === 0}
                            onClick={() => setBulkPickerMode('unpack')}
                        >
                            <LucidePackageOpenIcon className='stroke-1' />
                            <span className='hidden sm:inline'>Desempacar</span>
                        </Button>
                    </>
                ) : (
                    <>
                        {(children.length > 0 || items.length > 0 || totalPrice > 0) && (
                            <div className='flex h-8 shrink-0 items-center divide-x divide-border rounded-[min(var(--radius-md),10px)] border border-border bg-background shadow-xs dark:border-input dark:bg-input/30'>
                                {children.length > 0 && (
                                    <span className='flex h-full items-center gap-1.5 px-2.5 text-sm [&_svg]:size-3.5'>
                                        <PackageIcon className='text-muted-foreground' />
                                        <span className='font-medium tabular-nums'>
                                            {children.length}
                                        </span>
                                        <span className='hidden text-muted-foreground sm:inline'>
                                            ubicaciones
                                        </span>
                                    </span>
                                )}
                                {items.length > 0 && (
                                    <span className='flex h-full items-center gap-1.5 px-2.5 text-sm [&_svg]:size-3.5'>
                                        <LeafIcon className='text-muted-foreground' />
                                        <span className='font-medium tabular-nums'>
                                            {items.length}
                                        </span>
                                        <span className='hidden text-muted-foreground sm:inline'>
                                            artículos
                                        </span>
                                    </span>
                                )}
                                {totalPrice > 0 && (
                                    <span className='flex h-full items-center gap-1.5 px-2.5 text-sm [&_svg]:size-3.5'>
                                        <CurrencyDollarIcon className='text-muted-foreground' />
                                        <span className='font-medium tabular-nums'>
                                            ${Number(totalPrice).toLocaleString('es-MX')}
                                        </span>
                                        <span className='hidden text-muted-foreground sm:inline'>
                                            valor total
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}

                        <div className='flex-1' />

                        {location.parent_id && (
                            <Button
                                size='sm'
                                variant='outline'
                                disabled={isTransferring}
                                onClick={() => setTransferOpen(true)}
                            >
                                {isTransferring ? <Spinner /> : <ArrowsLeftRightIcon />}
                                <span className='hidden sm:inline'>Transferir</span>
                            </Button>
                        )}

                        {location.parent_id &&
                            (location.active_move_id ? (
                                <Button size='sm' variant='outline' onClick={() => setUnpackOpen(true)}>
                                    <LucidePackageOpenIcon className='stroke-1' />
                                    <span className='hidden sm:inline'>Desempacar</span>
                                </Button>
                            ) : (
                                <Button size='sm' variant='outline' onClick={() => setPackDialogOpen(true)}>
                                    <LucidePackageIcon className='stroke-1' />
                                    <span className='hidden sm:inline'>Empacar</span>
                                </Button>
                            ))}

                        <Button
                            size='sm'
                            variant='outline'
                            render={<Link href={`/item/new?location=${id}`} />}
                        >
                            <PlusIcon />
                            <LeafIcon />
                            <span className='hidden sm:inline'>Item</span>
                        </Button>

                        <CreateLocationDialog
                            workspaceId={location.workspace_id}
                            parentId={id}
                            title='Agregar ubicación'
                        >
                            <Button size='sm' variant='outline'>
                                <PlusIcon />
                                <PackageIcon />
                                <span className='hidden sm:inline'>Location</span>
                            </Button>
                        </CreateLocationDialog>

                        {location.is_item && (
                            <RatingToggle
                                workspaceId={location.workspace_id}
                                entityType='location'
                                entityId={id}
                                ratings={locationRatings}
                            />
                        )}

                        <Button size='sm' variant='outline' render={<Link href={`/location/${id}/edit`} />}>
                            <PencilSimpleIcon />
                            <span className='hidden sm:inline'>Editar</span>
                        </Button>
                    </>
                )}
            </ScrollToolbar>

            <LocationPicker
                open={transferOpen}
                onOpenChange={setTransferOpen}
                workspaceId={location.workspace_id}
                onSelect={handleTransfer}
            />

            <LocationPicker
                open={unpackOpen}
                onOpenChange={setUnpackOpen}
                workspaceId={location.workspace_id}
                onSelect={handleUnpack}
                quickDestination={
                    location.parent_id
                        ? { id: location.parent_id, name: parentName ?? 'nivel anterior' }
                        : null
                }
            />

            <PackIntoMoveDialog
                workspaceId={location.workspace_id}
                open={packDialogOpen}
                onOpenChange={setPackDialogOpen}
                onSelect={handlePack}
            />

            <PhotoLightbox
                photos={locationPhotos}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
            />

            <LocationPicker
                open={bulkPickerMode !== null}
                onOpenChange={open => !open && setBulkPickerMode(null)}
                workspaceId={location.workspace_id}
                onSelect={handleBulkPickerSelect}
                quickDestination={
                    // Every selectable row on this page (children/items) already
                    // lives in `id` — packing never moves anything, so that's a
                    // single, uniform "unpack in place" target for the whole
                    // selection. Only for unpack — transfer has no such shortcut.
                    bulkPickerMode === 'unpack' ? { id, name: location.name } : null
                }
            />

            <PackIntoMoveDialog
                workspaceId={location.workspace_id}
                open={bulkPackOpen}
                onOpenChange={setBulkPackOpen}
                onSelect={handleBulkPack}
            />

            {isEmpty ? (
                <Empty className='flex-1' data-block='LocationEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon'>
                            <DynamicIcon icon={getLocationIcon(location)} />
                        </EmptyMedia>
                        <EmptyTitle>Vacío por ahora</EmptyTitle>
                        <EmptyDescription>Agrega algo dentro para empezar.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className='flex-row justify-center'>
                        <Button variant='outline' render={<Link href={`/item/new?location=${id}`} />}>
                            <PlusIcon />
                            <LeafIcon />
                            Item
                        </Button>
                        <CreateLocationDialog
                            workspaceId={location.workspace_id}
                            parentId={id}
                            title='Agregar ubicación'
                        >
                            <Button variant='outline'>
                                <PlusIcon />
                                <PackageIcon />
                                Location
                            </Button>
                        </CreateLocationDialog>
                    </EmptyContent>
                </Empty>
            ) : (
                <div className={cn('flex flex-col gap-4', isDesktop && 'min-h-0 flex-1')}>
                    <div className='flex items-center justify-between gap-2'>
                        <Tabs value={packFilter} onValueChange={setPackFilter}>
                            <TabsList>
                                <TabsTrigger value='all'>Todos</TabsTrigger>
                                <TabsTrigger value='packed'>Empacado</TabsTrigger>
                                <TabsTrigger value='unpacked'>Sin empacar</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Tabs value={viewType} onValueChange={setViewType}>
                            <TabsList>
                                <Tooltip>
                                    <TooltipTrigger render={<TabsTrigger value='list' />}>
                                        <ListIcon />
                                        <span className='sr-only'>Vista de lista</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Lista</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger render={<TabsTrigger value='cards' />}>
                                        <SquaresFourIcon />
                                        <span className='sr-only'>Vista de tarjetas</span>
                                    </TooltipTrigger>
                                    <TooltipContent>Tarjetas</TooltipContent>
                                </Tooltip>
                            </TabsList>
                        </Tabs>
                    </div>

                    {isDesktop ? (
                        // Desktop-only: 2/5 locations | 3/5 items, drag items onto a
                        // location to transfer them, drag a location onto another to
                        // nest it. Mobile keeps the single stacked list below untouched
                        // (no drag gestures, per the owner's call to avoid touch issues).
                        // Each side scrolls independently and always fills the full
                        // available height, even when empty or nearly empty.
                        <DndContext
                            sensors={dndSensors}
                            collisionDetection={pointerWithin}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className='flex min-h-0 flex-1 gap-4'>
                                <div className='flex min-h-0 min-w-0 flex-2 flex-col gap-2'>
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
                                                placeholder='Filtrar ubicaciones…'
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
                                                    <span className='truncate'>
                                                        {option.label}
                                                    </span>
                                                </>
                                            )}
                                        />
                                    </div>
                                    <ScrollArea nav className='min-h-0 flex-1'>
                                    <div className='flex min-h-full flex-col gap-2'>
                                        {location.parent_id && (
                                            <MoveOutDropZone parentName={parentName} />
                                        )}
                                        {searchedChildren.length > 0 ? (
                                            viewType === 'cards' ? (
                                                <div className='grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2'>
                                                    {searchedChildren.map(child => (
                                                        <LocationCardItem
                                                            key={child.id}
                                                            location={child}
                                                            counts={childCounts?.[child.id]}
                                                            selectable={isSelecting}
                                                            selected={selectedLocationIds.has(
                                                                child.id,
                                                            )}
                                                            onToggle={toggleLocationSelection}
                                                            draggable
                                                            dragData={getLocationDragData(child)}
                                                            droppable
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                searchedChildren.map(child => (
                                                    <LocationListItem
                                                        key={child.id}
                                                        location={child}
                                                        counts={childCounts?.[child.id]}
                                                        selectable={isSelecting}
                                                        selected={selectedLocationIds.has(child.id)}
                                                        onToggle={toggleLocationSelection}
                                                        draggable
                                                        dragData={getLocationDragData(child)}
                                                        droppable
                                                    />
                                                ))
                                            )
                                        ) : (
                                            <Empty
                                                className='flex-1 -mt-16'
                                                data-block='SplitLocationsEmpty'
                                            >
                                                <EmptyHeader>
                                                    <EmptyMedia variant='icon'>
                                                        <DynamicIcon icon={FALLBACK_LOCATION_ICON} />
                                                    </EmptyMedia>
                                                    <EmptyTitle>
                                                        {locationSearch.trim()
                                                            ? 'Sin resultados'
                                                            : 'Sin ubicaciones'}
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        {locationSearch.trim()
                                                            ? 'Nada coincide con tu búsqueda.'
                                                            : 'Agrega una ubicación para organizar lo que guardes aquí.'}
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                                {!locationSearch.trim() && (
                                                    <EmptyContent>
                                                        <CreateLocationDialog
                                                            workspaceId={location.workspace_id}
                                                            parentId={id}
                                                            title='Agregar ubicación'
                                                        >
                                                            <Button size='sm' variant='outline'>
                                                                <PlusIcon />
                                                                <PackageIcon />
                                                                Ubicación
                                                            </Button>
                                                        </CreateLocationDialog>
                                                    </EmptyContent>
                                                )}
                                            </Empty>
                                        )}
                                    </div>
                                    </ScrollArea>
                                </div>
                                <Separator orientation='vertical' />
                                <div className='flex min-h-0 min-w-0 flex-3 flex-col gap-2'>
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
                                                placeholder='Filtrar artículos…'
                                            />
                                        </InputGroup>
                                        <SearchTagFilter
                                            className='w-36 shrink-0'
                                            workspaceId={location.workspace_id}
                                            value={tagFilter}
                                            onChange={setTagFilter}
                                        />
                                    </div>
                                    <ScrollArea nav className='min-h-0 flex-1'>
                                    <div className='flex min-h-full flex-col gap-2'>
                                        {searchedItems.length > 0 ? (
                                            viewType === 'cards' ? (
                                                <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2'>
                                                    {searchedItems.map(item => (
                                                        <ItemCardItem
                                                            key={item.id}
                                                            item={item}
                                                            selectable={isSelecting}
                                                            selected={selectedItemIds.has(item.id)}
                                                            onToggle={toggleItemSelection}
                                                            draggable
                                                            dragData={getItemDragData(item)}
                                                            {...getItemRatingCounts(item.id)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                searchedItems.map(item => (
                                                    <ItemListRow
                                                        key={item.id}
                                                        item={item}
                                                        selectable={isSelecting}
                                                        selected={selectedItemIds.has(item.id)}
                                                        onToggle={toggleItemSelection}
                                                        draggable
                                                        dragData={getItemDragData(item)}
                                                        {...getItemRatingCounts(item.id)}
                                                    />
                                                ))
                                            )
                                        ) : (
                                            <Empty
                                                className='flex-1 -mt-16'
                                                data-block='SplitItemsEmpty'
                                            >
                                                <EmptyHeader>
                                                    <EmptyMedia variant='icon'>
                                                        <DynamicIcon icon={FALLBACK_ITEM_ICON} />
                                                    </EmptyMedia>
                                                    <EmptyTitle>
                                                        {itemSearch.trim()
                                                            ? 'Sin resultados'
                                                            : 'Sin artículos'}
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        {itemSearch.trim()
                                                            ? 'Nada coincide con tu búsqueda.'
                                                            : 'Agrega un artículo para empezar a guardar cosas aquí.'}
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                                {!itemSearch.trim() && (
                                                    <EmptyContent>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            render={<Link href={`/item/new?location=${id}`} />}
                                                        >
                                                            <PlusIcon />
                                                            <LeafIcon />
                                                            Item
                                                        </Button>
                                                    </EmptyContent>
                                                )}
                                            </Empty>
                                        )}
                                    </div>
                                    </ScrollArea>
                                </div>
                            </div>
                            <DragOverlay>
                                {activeDrag && <DragPreview data={activeDrag} />}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            <Tabs value={mobileView} onValueChange={setMobileView}>
                                <TabsList className='w-full'>
                                    <TabsTrigger value='locations'>Ubicaciones</TabsTrigger>
                                    <TabsTrigger value='items'>Artículos</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {mobileView === 'locations' ? (
                                <>
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
                                                placeholder='Filtrar ubicaciones…'
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
                                                    <span className='truncate'>
                                                        {option.label}
                                                    </span>
                                                </>
                                            )}
                                        />
                                    </div>

                                    {searchedChildren.length > 0 ? (
                                        <div
                                            className={cn('gap-2', {
                                                'grid grid-cols-2': viewType === 'cards',
                                                'flex flex-col': viewType !== 'cards',
                                            })}
                                        >
                                            {searchedChildren.map(child =>
                                                viewType === 'cards' ? (
                                                    <LocationCardItem
                                                        key={child.id}
                                                        location={child}
                                                        counts={childCounts?.[child.id]}
                                                        selectable={isSelecting}
                                                        selected={selectedLocationIds.has(child.id)}
                                                        onToggle={toggleLocationSelection}
                                                    />
                                                ) : (
                                                    <LocationListItem
                                                        key={child.id}
                                                        location={child}
                                                        counts={childCounts?.[child.id]}
                                                        selectable={isSelecting}
                                                        selected={selectedLocationIds.has(child.id)}
                                                        onToggle={toggleLocationSelection}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <Empty data-block='MobileLocationsEmpty'>
                                            <EmptyHeader>
                                                <EmptyMedia variant='icon'>
                                                    <DynamicIcon icon={FALLBACK_LOCATION_ICON} />
                                                </EmptyMedia>
                                                <EmptyTitle>
                                                    {locationSearch.trim()
                                                        ? 'Sin resultados'
                                                        : 'Sin ubicaciones'}
                                                </EmptyTitle>
                                                <EmptyDescription>
                                                    {locationSearch.trim()
                                                        ? 'Nada coincide con tu búsqueda.'
                                                        : 'Agrega una ubicación para organizar lo que guardes aquí.'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                            {!locationSearch.trim() && (
                                                <EmptyContent>
                                                    <CreateLocationDialog
                                                        workspaceId={location.workspace_id}
                                                        parentId={id}
                                                        title='Agregar ubicación'
                                                    >
                                                        <Button size='sm' variant='outline'>
                                                            <PlusIcon />
                                                            <PackageIcon />
                                                            Ubicación
                                                        </Button>
                                                    </CreateLocationDialog>
                                                </EmptyContent>
                                            )}
                                        </Empty>
                                    )}
                                </>
                            ) : (
                                <>
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
                                                placeholder='Filtrar artículos…'
                                            />
                                        </InputGroup>
                                        <SearchTagFilter
                                            className='w-36 shrink-0'
                                            workspaceId={location.workspace_id}
                                            value={tagFilter}
                                            onChange={setTagFilter}
                                        />
                                    </div>

                                    {searchedItems.length > 0 ? (
                                        <div
                                            className={cn('gap-2', {
                                                'grid grid-cols-2': viewType === 'cards',
                                                'flex flex-col': viewType !== 'cards',
                                            })}
                                        >
                                            {searchedItems.map(item =>
                                                viewType === 'cards' ? (
                                                    <ItemCardItem
                                                        key={item.id}
                                                        item={item}
                                                        selectable={isSelecting}
                                                        selected={selectedItemIds.has(item.id)}
                                                        onToggle={toggleItemSelection}
                                                        {...getItemRatingCounts(item.id)}
                                                    />
                                                ) : (
                                                    <ItemListRow
                                                        key={item.id}
                                                        item={item}
                                                        selectable={isSelecting}
                                                        selected={selectedItemIds.has(item.id)}
                                                        onToggle={toggleItemSelection}
                                                        {...getItemRatingCounts(item.id)}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <Empty data-block='MobileItemsEmpty'>
                                            <EmptyHeader>
                                                <EmptyMedia variant='icon'>
                                                    <DynamicIcon icon={FALLBACK_ITEM_ICON} />
                                                </EmptyMedia>
                                                <EmptyTitle>
                                                    {itemSearch.trim() ? 'Sin resultados' : 'Sin artículos'}
                                                </EmptyTitle>
                                                <EmptyDescription>
                                                    {itemSearch.trim()
                                                        ? 'Nada coincide con tu búsqueda.'
                                                        : 'Agrega un artículo para empezar a guardar cosas aquí.'}
                                                </EmptyDescription>
                                            </EmptyHeader>
                                            {!itemSearch.trim() && (
                                                <EmptyContent>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        render={<Link href={`/item/new?location=${id}`} />}
                                                    >
                                                        <PlusIcon />
                                                        <LeafIcon />
                                                        Item
                                                    </Button>
                                                </EmptyContent>
                                            )}
                                        </Empty>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div
            className='absolute inset-0 flex flex-col gap-4 overflow-hidden p-4'
            data-block='LocationPage'
        >
            {// PackedTapeTop is absolutely positioned against this page's own
            // padding box — kept outside the mobile ScrollArea below so it
            // never scrolls away with the rest of the content. Shown for an
            // inherited pack too (see isLocationPacked above), not just this
            // location's own active_move_id.
            isLocationPacked && (
                <PackedTapeTop moveId={packedMoveId} moveName={packedMove?.name} />
            )}

            {isDesktop ? (
                mainContent
            ) : (
                // `-m-4` cancels this page's own p-4 so the ScrollArea's Root
                // (nav bars, scrollbar thumb) reaches the true screen edges
                // instead of floating inset with dead space around it; the
                // p-4 moves onto the inner content div so the actual content
                // keeps the same visual margin as before.
                <ScrollArea nav className='-m-4 min-h-0 flex-1'>
                    <div className='flex flex-col gap-4 p-4'>{mainContent}</div>
                </ScrollArea>
            )}
        </div>
    );
}
