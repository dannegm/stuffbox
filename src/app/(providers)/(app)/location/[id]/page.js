'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    PlusIcon,
    DotsThreeVerticalIcon,
    PencilSimpleIcon,
    TrashIcon,
    PackageIcon,
    ArrowsLeftRightIcon,
    CheckSquareIcon,
    XIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
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
} from '@/queries/locations';
import { itemsAtLocationQuery } from '@/queries/items';
import { bulkTransferMutation, bulkPackMutation, bulkUnpackMutation } from '@/queries/bulk';
import { moveQuery } from '@/queries/moves';
import { LocationListItem } from '@/components/locations/location-list-item';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { CreateLocationDialog } from '@/components/locations/create-location-dialog';
import { EditLocationDialog } from '@/components/locations/edit-location-dialog';
import { LocationPicker } from '@/components/locations/location-picker';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { ItemListRow } from '@/components/items/item-list-row';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { Separator } from '@/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='LocationLoading'>
        <Spinner className='size-6' />
    </div>
);

export default function LocationPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [editOpen, setEditOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [selectedLocationIds, setSelectedLocationIds] = useState(new Set());
    const [bulkPickerMode, setBulkPickerMode] = useState(null); // null | 'transfer' | 'unpack'
    const [bulkPackOpen, setBulkPackOpen] = useState(false);
    const [packFilter, setPackFilter] = useState('all'); // 'all' | 'packed' | 'unpacked'

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

    const handlePack = moveId => pack({ id, moveId });
    const handleUnpack = newParentId => unpack({ id, parentId: newParentId });

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

    const handleBulkPickerSelect = destinationId => {
        const payload = {
            itemIds: [...selectedItemIds],
            locationIds: [...selectedLocationIds],
            destinationId,
        };
        if (bulkPickerMode === 'transfer') bulkTransfer(payload);
        else if (bulkPickerMode === 'unpack') bulkUnpack(payload);
        setBulkPickerMode(null);
    };

    const handleBulkPack = moveId => {
        bulkPack({ itemIds: [...selectedItemIds], locationIds: [...selectedLocationIds], moveId });
        setBulkPackOpen(false);
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

    const handleDelete = () => {
        const warning =
            children?.length || items?.length
                ? `"${location.name}" tiene ${children.length} location(s) y ${items.length} item(s) dentro. Se eliminará todo. ¿Continuar?`
                : `¿Eliminar "${location.name}"? Esto no se puede deshacer.`;
        if (!window.confirm(warning)) return;
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

    const matchesPackFilter = entity => {
        if (packFilter === 'packed') return !!entity.active_move_id;
        if (packFilter === 'unpacked') return !entity.active_move_id;
        return true;
    };
    const filteredChildren = children.filter(matchesPackFilter);
    const filteredItems = items.filter(matchesPackFilter);
    const hasFilteredResults = filteredChildren.length > 0 || filteredItems.length > 0;

    return (
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='LocationPage'>
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
                currentIcon={getLocationIcon(location)}
            />

            <div className='flex items-center justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                        <DynamicIcon icon={getLocationIcon(location)} />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-lg leading-tight font-medium'>
                            {location.name}
                        </h1>
                        <p className='truncate text-xs text-muted-foreground capitalize'>
                            {location.type}
                            {location.is_container && totalPrice > 0 && (
                                <> · ${Number(totalPrice).toLocaleString('es-MX')}</>
                            )}
                        </p>
                    </div>
                </div>
                <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
                    {selectionMode ? (
                        <>
                            <span className='text-xs text-muted-foreground'>
                                {selectedCount} seleccionado(s)
                            </span>
                            <Button
                                size='sm'
                                variant='outline'
                                disabled={selectedCount === 0}
                                onClick={() => setBulkPickerMode('transfer')}
                            >
                                <ArrowsLeftRightIcon data-icon='inline-start' />
                                Transferir
                            </Button>
                            <Button
                                size='sm'
                                variant='outline'
                                disabled={selectedCount === 0}
                                onClick={() => setBulkPackOpen(true)}
                            >
                                <PackageIcon data-icon='inline-start' />
                                Empacar
                            </Button>
                            <Button
                                size='sm'
                                variant='outline'
                                disabled={selectedCount === 0}
                                onClick={() => setBulkPickerMode('unpack')}
                            >
                                <PackageIcon data-icon='inline-start' />
                                Desempacar
                            </Button>
                            <Button size='sm' variant='ghost' onClick={exitSelectionMode}>
                                <XIcon data-icon='inline-start' />
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            {location.is_container &&
                                (location.active_move_id ? (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setUnpackOpen(true)}
                                    >
                                        <PackageIcon data-icon='inline-start' />
                                        Desempacar{packedMove ? `: ${packedMove.name}` : ''}
                                    </Button>
                                ) : (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setPackDialogOpen(true)}
                                    >
                                        <PackageIcon data-icon='inline-start' />
                                        Empacar
                                    </Button>
                                ))}
                            <Button
                                size='sm'
                                variant='outline'
                                render={<Link href={`/item/new?location=${id}`} />}
                            >
                                <PlusIcon data-icon='inline-start' />
                                Item
                            </Button>
                            <CreateLocationDialog
                                workspaceId={location.workspace_id}
                                parentId={id}
                                title='Agregar dentro'
                            >
                                <Button size='sm' variant='outline'>
                                    <PlusIcon data-icon='inline-start' />
                                    Location
                                </Button>
                            </CreateLocationDialog>
                            {!isEmpty && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setSelectionMode(true)}
                                >
                                    <CheckSquareIcon data-icon='inline-start' />
                                    Seleccionar
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={<Button size='icon-sm' variant='outline' />}
                                >
                                    <DotsThreeVerticalIcon />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                                        <PencilSimpleIcon />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant='destructive' onClick={handleDelete}>
                                        <TrashIcon />
                                        Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>

            <EditLocationDialog location={location} open={editOpen} onOpenChange={setEditOpen} />

            <LocationPicker
                open={unpackOpen}
                onOpenChange={setUnpackOpen}
                workspaceId={location.workspace_id}
                onSelect={handleUnpack}
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
                </Empty>
            ) : (
                <div className='flex flex-col gap-4'>
                    <Tabs value={packFilter} onValueChange={setPackFilter}>
                        <TabsList>
                            <TabsTrigger value='all'>Todos</TabsTrigger>
                            <TabsTrigger value='packed'>Empacado</TabsTrigger>
                            <TabsTrigger value='unpacked'>Sin empacar</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {!hasFilteredResults && (
                        <p className='py-6 text-center text-sm text-muted-foreground'>
                            Nada que coincida con este filtro.
                        </p>
                    )}

                    {filteredChildren.length > 0 && (
                        <div className='flex flex-col gap-2'>
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

                    {filteredChildren.length > 0 && filteredItems.length > 0 && <Separator />}

                    {filteredItems.length > 0 && (
                        <div className='flex flex-col gap-2'>
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
                </div>
            )}
        </div>
    );
}
