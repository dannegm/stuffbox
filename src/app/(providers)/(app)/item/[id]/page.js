'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    WarningIcon,
    ArrowsLeftRightIcon,
    PackageIcon,
    ScanIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    TreeStructureIcon,
    CopySimpleIcon,
    DotsThreeVerticalIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import {
    itemQuery,
    updateItemMutation,
    deleteItemMutation,
    transferItemMutation,
    packItemMutation,
    unpackItemMutation,
    duplicateItemMutation,
} from '@/queries/items';
import { locationQuery, locationAncestorsQuery } from '@/queries/locations';
import { workspaceQuery } from '@/queries/workspaces';
import { optionListsQuery } from '@/queries/option-lists';
import { itemTagsQuery, syncItemTagsMutation, tagsQuery } from '@/queries/tags';
import { moveQuery } from '@/queries/moves';
import { entityRatingsForEntityQuery } from '@/queries/entity-ratings';
import { RatingAvatarStack } from '@/components/deck/rating-avatar-stack';
import { RatingToggle } from '@/components/deck/rating-toggle';
import { useItemPhotos } from '@/hooks/use-item-photos';
import { deleteR2Objects } from '@/services/uploads';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { TagPicker } from '@/components/items/tag-picker';
import { ScanSkuDialog } from '@/components/items/scan-sku-dialog';
import { SkuBarcodeDisplay } from '@/components/items/sku-barcode-display';
import { ConvertToLocationDialog } from '@/components/items/convert-to-location-dialog';
import { PhotoGallery } from '@/ui/photo-gallery';
import { HeartRating } from '@/ui/heart-rating';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { PackedTapeTop } from '@/components/moves/packed-tape';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { LocationPicker } from '@/components/locations/location-picker';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { FALLBACK_ITEM_ICON, FALLBACK_TAG_ICON } from '@/constants/location-icons';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
} from '@/ui/input-group';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='ItemLoading'>
        <Skeleton className='h-4 w-56 rounded' />
        <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
            <div className='flex justify-end gap-2'>
                <Skeleton className='h-9 w-24 rounded-md' />
                <Skeleton className='h-9 w-28 rounded-md' />
            </div>
            <Skeleton className='h-32 w-full rounded-xl' />
            <Skeleton className='h-40 w-full rounded-xl' />
            <Skeleton className='h-32 w-full rounded-xl' />
        </div>
    </div>
);

export default function ItemPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const confirm = useConfirm();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: item, isPending: isItemPending } = useQuery(itemQuery(id, { enabled: !!user }));
    // Plain variables, not inline `item?.x` — the React Compiler's
    // auto-memoization synthesizes a dependency check for hook-call
    // arguments derived from a member expression, and (at least in this
    // version) does it as a bare `item.location_id` read, dropping the `?.`.
    // That check runs unconditionally on every render, including the very
    // first one where `item` is still undefined (query pending) — crashing
    // before the loading guard below ever gets a chance to return early.
    // Assigning to a real variable first means the optional chaining is
    // evaluated by the JS runtime itself, not re-synthesized by the compiler.
    const itemLocationId = item?.location_id;
    const itemActiveMoveId = item?.active_move_id;
    const itemName = item?.name;
    const { data: location } = useQuery(locationQuery(itemLocationId, { enabled: !!item }));
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
        moveQuery(itemActiveMoveId, { enabled: !!itemActiveMoveId }),
    );
    const { data: ratings } = useQuery(entityRatingsForEntityQuery('item', id));
    const likes = (ratings ?? []).filter(rating => rating.liked);
    const dislikes = (ratings ?? []).filter(rating => !rating.liked);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState('');
    const [storageOrientation, setStorageOrientation] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [icon, setIcon] = useState(null);
    const [sku, setSku] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [sentimentalValue, setSentimentalValue] = useState(null);
    const [tagIds, setTagIds] = useState([]);
    const [error, setError] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [convertOpen, setConvertOpen] = useState(false);

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
        setSentimentalValue(item.sentimental_value ?? null);
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
                // Back to the container rather than staying on the item's
                // own page — the toast's "Ver" action is what actually
                // reopens it, same shape as the create flow.
                router.replace(`/location/${updated.location_id}`);
                toast.success(`"${updated.name}" actualizado`, {
                    action: { label: 'Ver', onClick: () => router.push(`/item/${id}`) },
                });
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
                    queryKey: ['items', 'by-location', itemLocationId],
                });
                router.replace(`/location/${itemLocationId}`);
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: transfer, isPending: isTransferring } = useMutation(
        transferItemMutation({
            onSuccess: updated => {
                const previousLocationId = itemLocationId;
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

    const { mutate: duplicate, isPending: isDuplicating } = useMutation(
        duplicateItemMutation({
            onSuccess: duplicated => {
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', duplicated.location_id],
                });
                // Pushed, not replaced — unlike delete/convert (where the
                // original item stops existing), the source item is still
                // there, so the back button returning to it is expected.
                router.push(`/item/${duplicated.id}`);
                toast.success(`"${duplicated.name}" creado`, {
                    action: { label: 'Ver original', onClick: () => router.push(`/item/${id}`) },
                });
            },
            onError: err => setError(err.message),
        }),
    );

    const handleTransfer = newLocationId => transfer({ id, locationId: newLocationId });
    const handlePack = moveId => pack({ id, moveId });
    const handleUnpack = newLocationId => unpack({ id, locationId: newLocationId });

    const handleDuplicate = async () => {
        const ok = await confirm({
            title: `¿Duplicar "${itemName}"?`,
            description:
                'Se crea una copia completa en el mismo contenedor, con sus propias fotos y los mismos tags.',
            confirmLabel: 'Duplicar',
        });
        if (!ok) return;
        duplicate({ item, photos: itemPhotos.photos, tagIds });
    };

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
            sentimentalValue,
        });
        syncTags({ itemId: id, tagIds });
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: `¿Eliminar "${itemName}"?`,
            description: 'Esto no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: itemName,
        });
        if (!ok) return;
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
        <div className='relative flex flex-1 flex-col gap-4 p-4 pb-12' data-block='ItemPage'>
            {item.active_move_id && (
                <PackedTapeTop moveId={item.active_move_id} moveName={packedMove?.name} />
            )}
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={[...(ancestors ?? []), location]}
                current={item}
                currentIcon={previewIcon}
            />

            <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                <div
                    className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                    data-block='ItemEditHero'
                >
                    <div className='flex items-start gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                            <DynamicIcon icon={previewIcon} />
                        </span>
                        <div className='min-w-0'>
                            <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                                ITEM
                            </p>
                            <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                                {name}
                            </h1>
                        </div>
                    </div>
                    <div className='h-1 bg-muted/50' />

                    <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
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

                        <div className='flex flex-1' />

                        <ResponsiveDropdownMenu>
                            <ResponsiveDropdownMenuTrigger
                                render={<Button size='icon-sm' variant='outline' />}
                            >
                                <DotsThreeVerticalIcon />
                            </ResponsiveDropdownMenuTrigger>
                            <ResponsiveDropdownMenuContent align='end'>
                                <ResponsiveDropdownMenuItem
                                    onClick={() => setConvertOpen(true)}
                                >
                                    <TreeStructureIcon />
                                    Convertir en contenedor
                                </ResponsiveDropdownMenuItem>
                                <ResponsiveDropdownMenuItem
                                    disabled={isDuplicating}
                                    onClick={handleDuplicate}
                                >
                                    {isDuplicating ? <Spinner /> : <CopySimpleIcon />}
                                    Duplicar
                                </ResponsiveDropdownMenuItem>
                            </ResponsiveDropdownMenuContent>
                        </ResponsiveDropdownMenu>
                    </div>
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
                    quickDestination={{ id: location.id, name: location.name }}
                />

                <PackIntoMoveDialog
                    workspaceId={location.workspace_id}
                    open={packDialogOpen}
                    onOpenChange={setPackDialogOpen}
                    onSelect={handlePack}
                />

                <ConvertToLocationDialog
                    item={item}
                    workspaceId={location.workspace_id}
                    parentLocationId={location.id}
                    open={convertOpen}
                    onOpenChange={setConvertOpen}
                />

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemIdentityCard'
                    >
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
                                            className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted [&_svg]:size-4'
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
                        </FieldGroup>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemDetailsCard'
                    >
                        <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Detalles
                        </h2>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='item-description'>Descripción</FieldLabel>
                                <Textarea
                                    id='item-description'
                                    value={description}
                                    onChange={event => setDescription(event.target.value)}
                                    placeholder='Opcional'
                                />
                            </Field>

                            <div className='grid grid-cols-2 gap-3'>
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
                                    <FieldLabel htmlFor='item-price'>Precio</FieldLabel>

                                    <InputGroup>
                                        <InputGroupAddon>
                                            <InputGroupText>$</InputGroupText>
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            id='item-price'
                                            type='number'
                                            min={0}
                                            step='0.01'
                                            value={purchasePrice}
                                            onChange={event => setPurchasePrice(event.target.value)}
                                            placeholder='Opcional'
                                        />
                                        <InputGroupAddon align='inline-end'>
                                            <InputGroupText>mxn</InputGroupText>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </Field>
                            </div>

                            <Field>
                                <FieldLabel htmlFor='item-sku'>SKU</FieldLabel>
                                <InputGroup>
                                    <InputGroupInput
                                        id='item-sku'
                                        value={sku}
                                        onChange={event => setSku(event.target.value)}
                                        placeholder='Opcional'
                                    />
                                    <InputGroupAddon align='inline-end'>
                                        <InputGroupButton
                                            size='icon-xs'
                                            aria-label='Escanear código'
                                            onClick={() => setIsScanOpen(true)}
                                        >
                                            <ScanIcon />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                </InputGroup>
                                <SkuBarcodeDisplay value={sku} onChange={setSku} />
                                <ScanSkuDialog
                                    open={isScanOpen}
                                    onOpenChange={setIsScanOpen}
                                    onScan={setSku}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemDetailsCard'
                    >
                        <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Fotos
                        </h2>

                        <FieldGroup>
                            <Field>
                                <PhotoGallery
                                    photos={itemPhotos.photos}
                                    pending={itemPhotos.pending}
                                    isProcessing={itemPhotos.isProcessing}
                                    onAddFiles={itemPhotos.addFiles}
                                    onRemove={itemPhotos.removePhoto}
                                    onUpdateCrop={itemPhotos.updateCrop}
                                    onReorder={itemPhotos.reorderPhotos}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemClassificationCard'
                    >
                        <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Clasificación
                        </h2>
                        <FieldGroup>
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
                        </FieldGroup>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemRatingsCard'
                    >
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center justify-between gap-2'>
                                <h2 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                    Calificaciones
                                </h2>
                                <RatingToggle
                                    workspaceId={location.workspace_id}
                                    entityType='item'
                                    entityId={id}
                                    ratings={ratings ?? []}
                                />
                            </div>
                            {(likes.length > 0 || dislikes.length > 0) && (
                                <div className='flex flex-wrap gap-6'>
                                    {likes.length > 0 && (
                                        <div className='flex flex-col gap-1.5'>
                                            <span className='flex items-center gap-1 text-xs text-emerald-600 [&_svg]:size-3.5'>
                                                <ThumbsUpIcon weight='fill' />
                                                {likes.length}
                                            </span>
                                            <RatingAvatarStack ratings={likes} tone='like' />
                                        </div>
                                    )}
                                    {dislikes.length > 0 && (
                                        <div className='flex flex-col gap-1.5'>
                                            <span className='flex items-center gap-1 text-xs text-rose-600 [&_svg]:size-3.5'>
                                                <ThumbsDownIcon weight='fill' />
                                                {dislikes.length}
                                            </span>
                                            <RatingAvatarStack ratings={dislikes} tone='dislike' />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemExtrasCard'
                    >
                        <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Extras
                        </h2>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Valor sentimental</FieldLabel>
                                <HeartRating
                                    value={sentimentalValue}
                                    onChange={setSentimentalValue}
                                />
                            </Field>

                            <Field
                                orientation='horizontal'
                                className='rounded-lg border bg-muted/30 px-3 py-2.5'
                            >
                                <FieldLabel htmlFor='item-fragile' className='flex-1'>
                                    <WarningIcon className='text-muted-foreground' />
                                    Es frágil
                                </FieldLabel>
                                <Switch
                                    id='item-fragile'
                                    checked={isFragile}
                                    onCheckedChange={setIsFragile}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    <FieldError>{error}</FieldError>

                    {/* Repeats ItemIdentityCard's icon+name row, bound to
                    the same state — details/photos/classification/extras
                    cards above push the original well out of view by the
                    time you reach these buttons. */}
                    <div
                        className='flex items-center gap-2 rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'
                        data-block='ItemEditBottomIdentity'
                    >
                        <IconPicker
                            value={icon}
                            onChange={setIcon}
                            suggestedIcons={suggestedIcons}
                        >
                            <button
                                type='button'
                                aria-label='Elegir ícono'
                                className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted [&_svg]:size-4'
                            >
                                <DynamicIcon icon={previewIcon} />
                            </button>
                        </IconPicker>
                        <Input
                            id='item-name-bottom'
                            required
                            value={name}
                            onChange={event => setName(event.target.value)}
                            aria-label='Nombre'
                        />
                    </div>

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
