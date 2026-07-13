'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WarningDiamondIcon, ArrowsLeftRightIcon, PackageIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import {
    itemQuery,
    updateItemMutation,
    deleteItemMutation,
    transferItemMutation,
    packItemMutation,
    unpackItemMutation,
} from '@/queries/items';
import { locationQuery, locationAncestorsQuery } from '@/queries/locations';
import { workspaceQuery } from '@/queries/workspaces';
import { optionListsQuery } from '@/queries/option-lists';
import { itemTagsQuery, syncItemTagsMutation, tagsQuery } from '@/queries/tags';
import { moveQuery } from '@/queries/moves';
import { useItemPhotos } from '@/hooks/use-item-photos';
import { deleteR2Objects } from '@/services/uploads';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { TagPicker } from '@/components/items/tag-picker';
import { PhotoGallery } from '@/ui/photo-gallery';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { LocationPicker } from '@/components/locations/location-picker';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { FALLBACK_ITEM_ICON, FALLBACK_TAG_ICON } from '@/constants/location-icons';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='ItemLoading'>
        <Spinner className='size-6' />
    </div>
);

export default function ItemPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: item, isPending: isItemPending } = useQuery(itemQuery(id, { enabled: !!user }));
    const { data: location } = useQuery(locationQuery(item?.location_id, { enabled: !!item }));
    const { data: workspace } = useQuery(
        workspaceQuery(location?.workspace_id, { enabled: !!location }),
    );
    const { data: ancestors } = useQuery(locationAncestorsQuery(location?.parent_id));
    const { data: conditions } = useQuery(
        optionListsQuery(location?.workspace_id, 'condition', { enabled: !!location }),
    );
    const { data: orientations } = useQuery(
        optionListsQuery(location?.workspace_id, 'orientation', { enabled: !!location }),
    );
    const { data: itemTags } = useQuery(itemTagsQuery(id, { enabled: !!item }));
    const { data: tags } = useQuery(tagsQuery(location?.workspace_id));
    const { data: packedMove } = useQuery(
        moveQuery(item?.active_move_id, { enabled: !!item?.active_move_id }),
    );

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState('');
    const [storageOrientation, setStorageOrientation] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [icon, setIcon] = useState(null);
    const [sku, setSku] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [tagIds, setTagIds] = useState([]);
    const [error, setError] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);

    useEffect(() => {
        if (!item) return;
        setName(item.name);
        setDescription(item.description ?? '');
        setQuantity(item.quantity);
        setCondition(item.condition ?? '');
        setStorageOrientation(item.storage_orientation ?? '');
        setIsFragile(item.is_fragile);
        setIcon(item.icon ?? null);
        setSku(item.sku ?? '');
        setPurchasePrice(item.purchase_price != null ? String(item.purchase_price) : '');
    }, [item]);

    useEffect(() => {
        if (itemTags) setTagIds(itemTags.map(tag => tag.id));
    }, [itemTags]);

    const { mutate: syncTags } = useMutation(
        syncItemTagsMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-tags', id] }),
        }),
    );

    const itemPhotos = useItemPhotos({ itemId: id, workspaceId: location?.workspace_id });

    const { mutate: save, isPending: isSaving } = useMutation(
        updateItemMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['item', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', updated.location_id],
                });
                setError(null);
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: destroy, isPending: isDeleting } = useMutation(
        deleteItemMutation({
            onSuccess: () => {
                // item_photos rows cascade-delete with the item — the R2
                // objects don't, so clean those up here (immediate-deletion
                // path; the future "optimize storage" button is the net).
                deleteR2Objects(itemPhotos.photos.map(photo => photo.r2_key));
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', item?.location_id],
                });
                router.replace(`/location/${item?.location_id}`);
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: transfer, isPending: isTransferring } = useMutation(
        transferItemMutation({
            onSuccess: updated => {
                const previousLocationId = item?.location_id;
                queryClient.setQueryData(['item', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', previousLocationId],
                });
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', updated.location_id],
                });
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: pack } = useMutation(
        packItemMutation({
            onSuccess: updated => queryClient.setQueryData(['item', id], updated),
        }),
    );

    const { mutate: unpack } = useMutation(
        unpackItemMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['item', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', updated.location_id],
                });
            },
        }),
    );

    const handleTransfer = newLocationId => transfer({ id, locationId: newLocationId });
    const handlePack = moveId => pack({ id, moveId });
    const handleUnpack = newLocationId => unpack({ id, locationId: newLocationId });

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        save({
            id,
            name: name.trim(),
            description: description.trim() || null,
            quantity: Number(quantity) || 1,
            condition: condition || null,
            storageOrientation: storageOrientation || null,
            isFragile,
            icon: icon ?? FALLBACK_ITEM_ICON,
            sku: sku.trim() || null,
            purchasePrice: purchasePrice === '' ? null : Number(purchasePrice),
        });
        syncTags({ itemId: id, tagIds });
    };

    const handleDelete = () => {
        if (!window.confirm(`¿Eliminar "${item?.name}"? Esto no se puede deshacer.`)) return;
        destroy(id);
    };

    if (isAuthLoading || !user || isItemPending || !item || !location || !workspace) {
        return <Loading />;
    }

    const previewIcon = icon ?? FALLBACK_ITEM_ICON;
    const suggestedIcons = (tags ?? [])
        .filter(tag => tagIds.includes(tag.id))
        .map(tag => tag.icon ?? FALLBACK_TAG_ICON);

    return (
        <div className='flex flex-1 flex-col gap-4 p-4 pb-12' data-block='ItemPage'>
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={[...(ancestors ?? []), location]}
                current={item}
                currentIcon={previewIcon}
            />

            <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                <div className='flex items-center justify-end gap-2'>
                    {item.active_move_id ? (
                        <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={() => setUnpackOpen(true)}
                        >
                            <PackageIcon data-icon='inline-start' />
                            Desempacar{packedMove ? `: ${packedMove.name}` : ''}
                        </Button>
                    ) : (
                        <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={() => setPackDialogOpen(true)}
                        >
                            <PackageIcon data-icon='inline-start' />
                            Empacar
                        </Button>
                    )}
                    <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={isTransferring}
                        onClick={() => setPickerOpen(true)}
                    >
                        {isTransferring ? (
                            <Spinner data-icon='inline-start' />
                        ) : (
                            <ArrowsLeftRightIcon data-icon='inline-start' />
                        )}
                        Transferir
                    </Button>
                </div>

                <LocationPicker
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    workspaceId={location.workspace_id}
                    onSelect={handleTransfer}
                />

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

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='item-name'>Nombre</FieldLabel>
                            <div className='flex items-center gap-2'>
                                <IconPicker
                                    value={icon}
                                    onChange={setIcon}
                                    suggestedIcons={suggestedIcons}
                                >
                                    <button
                                        type='button'
                                        aria-label='Elegir ícono'
                                        className='flex size-9 shrink-0 items-center justify-center rounded-md border border-input bg-transparent text-foreground transition-colors hover:bg-muted [&_svg]:size-4'
                                    >
                                        <DynamicIcon icon={previewIcon} />
                                    </button>
                                </IconPicker>
                                <Input
                                    id='item-name'
                                    required
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                />
                            </div>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='item-description'>Descripción</FieldLabel>
                            <Textarea
                                id='item-description'
                                value={description}
                                onChange={event => setDescription(event.target.value)}
                                placeholder='Opcional'
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='item-quantity'>Cantidad</FieldLabel>
                            <Input
                                id='item-quantity'
                                type='number'
                                min={1}
                                value={quantity}
                                onChange={event => setQuantity(event.target.value)}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='item-sku'>SKU</FieldLabel>
                            <Input
                                id='item-sku'
                                value={sku}
                                onChange={event => setSku(event.target.value)}
                                placeholder='Opcional'
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='item-price'>Precio</FieldLabel>
                            <Input
                                id='item-price'
                                type='number'
                                min={0}
                                step='0.01'
                                value={purchasePrice}
                                onChange={event => setPurchasePrice(event.target.value)}
                                placeholder='Opcional'
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Fotos</FieldLabel>
                            <PhotoGallery
                                photos={itemPhotos.photos}
                                pending={itemPhotos.pending}
                                isProcessing={itemPhotos.isProcessing}
                                onAddFiles={itemPhotos.addFiles}
                                onRemove={itemPhotos.removePhoto}
                            />
                        </Field>

                        <OptionDropdown
                            label='Condición'
                            value={condition}
                            onChange={setCondition}
                            options={conditions}
                        />

                        <OptionDropdown
                            label='Orientación de almacenaje'
                            value={storageOrientation}
                            onChange={setStorageOrientation}
                            options={orientations}
                        />

                        <Field>
                            <FieldLabel>Tags</FieldLabel>
                            <TagPicker
                                workspaceId={location.workspace_id}
                                value={tagIds}
                                onChange={setTagIds}
                            />
                        </Field>

                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='item-fragile' className='flex-1'>
                                <WarningDiamondIcon className='text-muted-foreground' />
                                Es frágil
                            </FieldLabel>
                            <Switch
                                id='item-fragile'
                                checked={isFragile}
                                onCheckedChange={setIsFragile}
                            />
                        </Field>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>

                    <div className='flex flex-col gap-2 border-t pt-4 sm:flex-row'>
                        <Button
                            type='button'
                            variant='destructive'
                            disabled={isSaving || isDeleting}
                            onClick={handleDelete}
                            className='sm:mr-auto'
                        >
                            {isDeleting && <Spinner data-icon='inline-start' />}
                            Eliminar
                        </Button>
                        <Button type='submit' disabled={isSaving || isDeleting || !name.trim()}>
                            {isSaving && <Spinner data-icon='inline-start' />}
                            Guardar cambios
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
