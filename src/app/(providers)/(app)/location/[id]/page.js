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
    CheckSquareIcon,
    XIcon,
    ArrowUpIcon,
    CurrencyDollarIcon,
    MagnifyingGlassIcon,
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
import { useIsMobile } from '@/hooks/use-mobile';
import { LocationListItem } from '@/components/locations/location-list-item';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { CreateLocationDialog } from '@/components/locations/create-location-dialog';
import { LocationPicker } from '@/components/locations/location-picker';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { PackedTapeTop } from '@/components/moves/packed-tape';
import { ItemListRow } from '@/components/items/item-list-row';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { FALLBACK_LOCATION_ICON, FALLBACK_ITEM_ICON } from '@/constants/location-icons';
import { cn } from '@/helpers/utils';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from '@/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Separator } from '@/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';

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
    const [transferOpen, setTransferOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [selectedLocationIds, setSelectedLocationIds] = useState(new Set());
    const [bulkPickerMode, setBulkPickerMode] = useState(null); // null | 'transfer' | 'unpack'
    const [bulkPackOpen, setBulkPackOpen] = useState(false);
    const [packFilter, setPackFilter] = useState('all'); // 'all' | 'packed' | 'unpacked'
    const [locationSearch, setLocationSearch] = useState(''); // desktop split view only
    const [itemSearch, setItemSearch] = useState(''); // desktop split view only
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
    const { data: packedMove } = useQuery(
        moveQuery(location?.active_move_id, { enabled: !!location?.active_move_id }),
    );
    const { data: totalPrice } = useQuery(
        locationTotalPriceQuery(id, { enabled: !!location?.is_container }),
    );
    const { data: childCounts } = useQuery(
        locationCountsQuery(children?.map(child => child.id) ?? [], {
            enabled: !!children?.length,
        }),
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
                title: 'No puedes mover esta location dentro de sí misma o de algo que contiene.',
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
            selectionMode && selectedItemIds.has(draggedItem.id)
                ? [...selectedItemIds]
                : [draggedItem.id];
        return { type: 'items', ids, label: ids.length === 1 ? draggedItem.name : null };
    };

    const getLocationDragData = draggedLocation => {
        const ids =
            selectionMode && selectedLocationIds.has(draggedLocation.id)
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
                title: 'No puedes soltar ahí — es la misma location o algo que ya contiene.',
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
                ? `Tiene ${children?.length} location(s) y ${items?.length} item(s) dentro. Se eliminará todo.`
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

    const isEmpty = children.length === 0 && items.length === 0;
    // Only the workspace owner can delete a house (a root location, no
    // parent) — collaborators can still delete anything nested inside one.
    const isOwner = workspace.owner_id === user.id;
    const canDeleteLocation = !!location.parent_id || isOwner;

    const matchesPackFilter = entity => {
        if (packFilter === 'packed') return !!entity.active_move_id;
        if (packFilter === 'unpacked') return !entity.active_move_id;
        return true;
    };
    const filteredChildren = children.filter(matchesPackFilter);
    const filteredItems = items.filter(matchesPackFilter);
    const hasFilteredResults = filteredChildren.length > 0 || filteredItems.length > 0;

    // Desktop split view only: filters what's already loaded via Fuse, no
    // refetch. Locations search by name/type, items by name/tag name.
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

    return (
        <div
            className={cn(
                'relative flex flex-1 flex-col gap-4 p-4',
                isDesktop && 'h-dvh overflow-hidden',
            )}
            data-block='LocationPage'
        >
            {location.active_move_id && (
                <PackedTapeTop moveId={location.active_move_id} moveName={packedMove?.name} />
            )}
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
                currentIcon={getLocationIcon(location)}
            />

            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='LocationHero'
            >
                <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5'>
                            <DynamicIcon icon={getLocationIcon(location)} />
                        </span>

                        <div className='min-w-0'>
                            <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                                {location.name}
                            </h1>
                            <p className='truncate text-xs text-muted-foreground capitalize'>
                                {location.type}
                            </p>
                        </div>
                    </div>

                    {(children.length > 0 || items.length > 0 || totalPrice > 0) && (
                        <div className='flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-2'>
                            {children.length > 0 && (
                                <Stat icon={PackageIcon} value={children.length} label='dentro' />
                            )}
                            {items.length > 0 && (
                                <Stat icon={LeafIcon} value={items.length} label='items' />
                            )}
                            {location.is_container && totalPrice > 0 && (
                                <Stat
                                    className='hidden sm:flex'
                                    icon={CurrencyDollarIcon}
                                    value={`$${Number(totalPrice).toLocaleString('es-MX')}`}
                                    label='valor total'
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className='h-1 bg-muted/50' />

                <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
                    {selectionMode ? (
                        <>
                            <span className='text-sm text-muted-foreground'>
                                {selectedCount} sel.
                            </span>

                            <Button
                                size='sm'
                                variant='outline'
                                disabled={selectedCount === 0}
                                onClick={() => setBulkPickerMode('transfer')}
                            >
                                <ArrowsLeftRightIcon />
                                Transferir
                            </Button>

                            <div className='flex flex-1' />

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

                            <Button size='sm' variant='ghost' onClick={exitSelectionMode}>
                                <XIcon />
                            </Button>
                        </>
                    ) : (
                        <>
                            {!isEmpty && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setSelectionMode(true)}
                                >
                                    <CheckSquareIcon />
                                </Button>
                            )}

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

                            {location.is_container &&
                                (location.active_move_id ? (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setUnpackOpen(true)}
                                    >
                                        <LucidePackageOpenIcon className='stroke-1' />
                                        <span
                                            className={cn('after:content-[_]', {
                                                'hidden sm:inline': packedMove,
                                            })}
                                        >
                                            Desempacar
                                        </span>
                                        <span>{packedMove ? `(${packedMove.name})` : ''}</span>
                                    </Button>
                                ) : (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setPackDialogOpen(true)}
                                    >
                                        <LucidePackageIcon className='stroke-1' />
                                        <span className='hidden sm:inline'>Empacar</span>
                                    </Button>
                                ))}

                            <div className='flex flex-1' />

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
                                title='Agregar dentro'
                            >
                                <Button size='sm' variant='outline'>
                                    <PlusIcon />
                                    <PackageIcon />
                                    <span className='hidden sm:inline'>Location</span>
                                </Button>
                            </CreateLocationDialog>

                            <ResponsiveDropdownMenu>
                                <ResponsiveDropdownMenuTrigger
                                    render={<Button size='icon-sm' variant='outline' />}
                                >
                                    <DotsThreeVerticalIcon />
                                </ResponsiveDropdownMenuTrigger>
                                <ResponsiveDropdownMenuContent align='end'>
                                    <ResponsiveDropdownMenuItem
                                        render={<Link href={`/location/${id}/edit`} />}
                                    >
                                        <PencilSimpleIcon />
                                        Editar
                                    </ResponsiveDropdownMenuItem>
                                    {canDeleteLocation && (
                                        <ResponsiveDropdownMenuItem
                                            variant='destructive'
                                            onClick={handleDelete}
                                        >
                                            <TrashIcon />
                                            Eliminar
                                        </ResponsiveDropdownMenuItem>
                                    )}
                                </ResponsiveDropdownMenuContent>
                            </ResponsiveDropdownMenu>
                        </>
                    )}
                </div>
            </div>

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
                    <EmptyContent className='flex-row'>
                        <Button variant='outline' render={<Link href={`/item/new?location=${id}`} />}>
                            <PlusIcon />
                            <LeafIcon />
                            Item
                        </Button>
                        <CreateLocationDialog
                            workspaceId={location.workspace_id}
                            parentId={id}
                            title='Agregar dentro'
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
                    <Tabs value={packFilter} onValueChange={setPackFilter}>
                        <TabsList>
                            <TabsTrigger value='all'>Todos</TabsTrigger>
                            <TabsTrigger value='packed'>Empacado</TabsTrigger>
                            <TabsTrigger value='unpacked'>Sin empacar</TabsTrigger>
                        </TabsList>
                    </Tabs>

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
                                    <InputGroup>
                                        <InputGroupAddon>
                                            <MagnifyingGlassIcon />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            value={locationSearch}
                                            onChange={event => setLocationSearch(event.target.value)}
                                            placeholder='Filtrar locations…'
                                        />
                                    </InputGroup>
                                    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'>
                                        {location.parent_id && (
                                            <MoveOutDropZone parentName={parentName} />
                                        )}
                                        {searchedChildren.length > 0 ? (
                                            searchedChildren.map(child => (
                                                <LocationListItem
                                                    key={child.id}
                                                    location={child}
                                                    counts={childCounts?.[child.id]}
                                                    selectable={selectionMode}
                                                    selected={selectedLocationIds.has(child.id)}
                                                    onToggle={toggleLocationSelection}
                                                    draggable
                                                    dragData={getLocationDragData(child)}
                                                    droppable
                                                />
                                            ))
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
                                                            : 'Sin locations'}
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        {locationSearch.trim()
                                                            ? 'Nada coincide con tu búsqueda.'
                                                            : 'Agrega una location para organizar lo que guardes aquí.'}
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                                {!locationSearch.trim() && (
                                                    <EmptyContent>
                                                        <CreateLocationDialog
                                                            workspaceId={location.workspace_id}
                                                            parentId={id}
                                                            title='Agregar dentro'
                                                        >
                                                            <Button size='sm' variant='outline'>
                                                                <PlusIcon />
                                                                <PackageIcon />
                                                                Location
                                                            </Button>
                                                        </CreateLocationDialog>
                                                    </EmptyContent>
                                                )}
                                            </Empty>
                                        )}
                                    </div>
                                </div>
                                <Separator orientation='vertical' />
                                <div className='flex min-h-0 min-w-0 flex-3 flex-col gap-2'>
                                    <InputGroup>
                                        <InputGroupAddon>
                                            <MagnifyingGlassIcon />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            value={itemSearch}
                                            onChange={event => setItemSearch(event.target.value)}
                                            placeholder='Filtrar items…'
                                        />
                                    </InputGroup>
                                    <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'>
                                        {searchedItems.length > 0 ? (
                                            searchedItems.map(item => (
                                                <ItemListRow
                                                    key={item.id}
                                                    item={item}
                                                    selectable={selectionMode}
                                                    selected={selectedItemIds.has(item.id)}
                                                    onToggle={toggleItemSelection}
                                                    draggable
                                                    dragData={getItemDragData(item)}
                                                />
                                            ))
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
                                                            : 'Sin items'}
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        {itemSearch.trim()
                                                            ? 'Nada coincide con tu búsqueda.'
                                                            : 'Agrega un item para empezar a guardar cosas aquí.'}
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
                                </div>
                            </div>
                            <DragOverlay>
                                {activeDrag && <DragPreview data={activeDrag} />}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <>
                            {!hasFilteredResults && (
                                <p className='py-6 text-center text-sm text-muted-foreground'>
                                    Nada que coincida con este filtro.
                                </p>
                            )}

                            {filteredChildren.length > 0 && (
                                <div className='flex flex-col gap-2'>
                                    <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                                        Locations
                                    </h2>
                                    {filteredChildren.map(child => (
                                        <LocationListItem
                                            key={child.id}
                                            location={child}
                                            counts={childCounts?.[child.id]}
                                            selectable={selectionMode}
                                            selected={selectedLocationIds.has(child.id)}
                                            onToggle={toggleLocationSelection}
                                        />
                                    ))}
                                </div>
                            )}

                            {filteredItems.length > 0 && (
                                <div className='flex flex-col gap-2'>
                                    <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                                        Items
                                    </h2>
                                    {filteredItems.map(item => (
                                        <ItemListRow
                                            key={item.id}
                                            item={item}
                                            selectable={selectionMode}
                                            selected={selectedItemIds.has(item.id)}
                                            onToggle={toggleItemSelection}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
