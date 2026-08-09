'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WarningIcon, ScanIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { locationQuery, locationAncestorsQuery } from '@/queries/locations';
import { workspaceQuery } from '@/queries/workspaces';
import { createItemMutation } from '@/queries/items';
import { optionListsQuery } from '@/queries/option-lists';
import { syncItemTagsMutation, tagsQuery } from '@/queries/tags';
import { useItemPhotos } from '@/hooks/use-item-photos';
import { deleteR2Objects } from '@/services/uploads';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { TagPicker } from '@/components/items/tag-picker';
import { ScanSkuDialog } from '@/components/items/scan-sku-dialog';
import { SkuBarcodeDisplay } from '@/components/items/sku-barcode-display';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { getLocationIcon } from '@/helpers/location';
import { PhotoGallery } from '@/ui/photo-gallery';
import { HeartRating } from '@/ui/heart-rating';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { StepperInput } from '@/ui/stepper-input';
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

export default function NewItemPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationId = searchParams.get('location');
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: location, isPending: isLocationPending } = useQuery(
        locationQuery(locationId, { enabled: !!user && !!locationId }),
    );
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
    const { data: tags } = useQuery(tagsQuery(location?.workspace_id));

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
    const [isScanOpen, setIsScanOpen] = useState(false);

    const resetForm = () => {
        setName('');
        setDescription('');
        setQuantity(1);
        setCondition('');
        setStorageOrientation('');
        setIsFragile(false);
        setIcon(null);
        setSku('');
        setPurchasePrice('');
        setSentimentalValue(null);
        setTagIds([]);
        // Firing scrollTo synchronously here races the layout shift from the
        // state resets above (cleared photos/tags collapse the form's
        // height) — browsers cancel an in-flight smooth scroll when that
        // happens mid-animation, so defer to after React flushes the DOM.
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    };

    const { mutate: syncTags } = useMutation(syncItemTagsMutation());
    const itemPhotos = useItemPhotos({ itemId: null, workspaceId: location?.workspace_id });

    const { mutate, isPending } = useMutation(
        createItemMutation({
            onSuccess: item => {
                if (tagIds.length > 0) syncTags({ itemId: item.id, tagIds });
                itemPhotos.commitPending(item.id);
            },
            onError: err => setError(err.message),
        }),
    );

    const buildVariables = () => {
        if (!name.trim() || !location) return null;
        return {
            workspaceId: location.workspace_id,
            locationId: location.id,
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
        };
    };

    const handleDiscard = () => {
        // Photos already uploaded to R2 for this not-yet-created item have no
        // item_photos row yet, so nothing cascades — clean them up here.
        deleteR2Objects(itemPhotos.pending.map(photo => photo.r2Key));
        router.replace(`/location/${locationId}`);
    };

    // Both save actions land somewhere that isn't the new item's own page
    // (its container, or the same blank form for another item), so the
    // toast's "Ver" action is the only direct way to actually open it.
    const notifyCreated = item =>
        toast.success(`"${item.name}" creado`, {
            action: { label: 'Ver', onClick: () => router.push(`/item/${item.id}`) },
        });

    const handleSaveAndFinish = event => {
        event.preventDefault();
        const variables = buildVariables();
        if (!variables) return;
        mutate(variables, {
            onSuccess: item => {
                router.replace(`/location/${location.id}`);
                notifyCreated(item);
            },
        });
    };

    const handleSaveAndCreateAnother = () => {
        const variables = buildVariables();
        if (!variables) return;
        mutate(variables, {
            onSuccess: item => {
                resetForm();
                notifyCreated(item);
            },
        });
    };

    if (isAuthLoading || !user || isLocationPending || !location || !workspace) {
        return (
            <div className='flex flex-1 flex-col gap-4 p-4' data-block='NewItemLoading'>
                <Skeleton className='h-4 w-56 rounded' />
                <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                    <Skeleton className='h-7 w-32 rounded' />
                    <Skeleton className='h-32 w-full rounded-xl' />
                    <Skeleton className='h-40 w-full rounded-xl' />
                    <Skeleton className='h-32 w-full rounded-xl' />
                </div>
            </div>
        );
    }

    const previewIcon = icon ?? FALLBACK_ITEM_ICON;
    const suggestedIcons = (tags ?? [])
        .filter(tag => tagIds.includes(tag.id))
        .flatMap(tag => [tag.icon ?? FALLBACK_TAG_ICON, ...(tag.related_icons ?? [])]);

    return (
        <div className='flex flex-1 flex-col gap-4 p-4 pb-12' data-block='NewItemPage'>
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
                currentIcon={getLocationIcon(location)}
            />

            <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                <div
                    className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                    data-block='NewItemHero'
                >
                    <div className='flex items-start gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                            <DynamicIcon icon={previewIcon} />
                        </span>
                        <div className='min-w-0'>
                            <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                                ARTÍCULO
                            </p>
                            <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                                {name.trim() || 'Nuevo artículo'}
                            </h1>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSaveAndFinish} className='flex flex-col gap-4'>
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
                                        autoFocus
                                        required
                                        value={name}
                                        onChange={event => setName(event.target.value)}
                                        placeholder='Ej. Taladro'
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
                                    <FieldLabel>Cantidad</FieldLabel>
                                    <StepperInput min={1} value={quantity} onChange={setQuantity} />
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
                                            inputMode='decimal'
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
                                        inputMode='numeric'
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
                        data-block='ItemPhotosCard'
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
                        data-block='ItemNewBottomIdentity'
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
                            placeholder='Ej. Taladro'
                            aria-label='Nombre'
                        />
                    </div>

                    <div className='flex flex-col gap-2 border-t pt-4 sm:flex-row'>
                        <Button
                            type='button'
                            variant='ghost'
                            disabled={isPending}
                            onClick={handleDiscard}
                            className='sm:mr-auto'
                        >
                            Terminar sin guardar
                        </Button>
                        <Button
                            type='submit'
                            variant='outline'
                            disabled={isPending || !name.trim()}
                        >
                            {isPending && <Spinner data-icon='inline-start' />}
                            Guardar y terminar
                        </Button>
                        <Button
                            type='button'
                            disabled={isPending || !name.trim()}
                            onClick={handleSaveAndCreateAnother}
                        >
                            {isPending && <Spinner data-icon='inline-start' />}
                            Guardar y crear otro
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
