'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import {
    WarningIcon,
    CardsThreeIcon,
    PackageIcon,
    SparkleIcon,
    ArrowsLeftRightIcon,
    CaretLeftIcon,
    QrCodeIcon,
} from '@phosphor-icons/react/ssr';
import {
    PackageIcon as LucidePackageIcon,
    PackageOpenIcon as LucidePackageOpenIcon,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { usePageTitle } from '@/hooks/use-page-title';
import { useSettings } from '@/hooks/use-settings';
import { defaultSettings } from '@/constants/default-settings';
import {
    locationQuery,
    locationAncestorsQuery,
    updateLocationMutation,
    deleteLocationMutation,
    getLocationContents,
    getLocationDescendantIds,
    transferLocationMutation,
    packLocationMutation,
    unpackLocationMutation,
} from '@/queries/locations';
import { workspaceQuery } from '@/queries/workspaces';
import { optionListsQuery } from '@/queries/option-lists';
import { moveQuery } from '@/queries/moves';
import { useLocationPhotos } from '@/hooks/use-location-photos';
import { generateLocationNameSuggestion } from '@/services/location-name-suggestions';
import { getInheritedPackedMoveId } from '@/helpers/moves';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { LocationPicker } from '@/components/locations/location-picker';
import { PackIntoMoveDialog } from '@/components/moves/pack-into-move-dialog';
import { ShareQrDialog } from '@/components/system/share-qr-dialog';
import { PackedTapeTop } from '@/components/moves/packed-tape';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { PhotoGallery } from '@/ui/photo-gallery';
import { HeartRating } from '@/ui/heart-rating';
import { SelectSearch } from '@/ui/select-search';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { getLocationIcon } from '@/helpers/location';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='LocationEditLoading'>
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

// Icon-only affordance next to the name field — suggests a name from the
// container's actual (recursive) contents. Disabled + explained via tooltip
// when the user hasn't set up an AI provider, same as the tag suggestions
// button on /tag/new.
const SuggestNameButton = ({ isAiConfigured, isLoading, onClick }) => (
    <Tooltip>
        <TooltipTrigger
            render={
                <button
                    type='button'
                    aria-label='Sugerir nombre con IA'
                    disabled={!isAiConfigured || isLoading}
                    onClick={onClick}
                    className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4'
                />
            }
        >
            {isLoading ? <Spinner /> : <SparkleIcon />}
        </TooltipTrigger>
        <TooltipContent>
            {isAiConfigured
                ? 'Sugiere un nombre según el contenido real del contenedor.'
                : 'Configura tu proveedor de IA en tu perfil primero.'}
        </TooltipContent>
    </Tooltip>
);

export default function LocationEditPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const confirm = useConfirm();

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
    const { data: orientations } = useQuery(
        optionListsQuery(location?.workspace_id, 'orientation', { enabled: !!location }),
    );
    const packedMoveId = getInheritedPackedMoveId(location?.active_move_id, ancestors);
    const isLocationPacked = !!packedMoveId;
    const { data: packedMove } = useQuery(moveQuery(packedMoveId, { enabled: !!packedMoveId }));
    const parentName = ancestors?.[ancestors.length - 1]?.name;
    const rootLocation = ancestors?.length ? ancestors[0] : location;
    usePageTitle([
        location?.name ? `Editar ${location.name}` : null,
        rootLocation?.id !== location?.id ? rootLocation?.name : null,
        workspace?.name,
    ]);

    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [icon, setIcon] = useState(null);
    const [description, setDescription] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [storageOrientation, setStorageOrientation] = useState('');
    const [sentimentalValue, setSentimentalValue] = useState(null);
    const [isContainer, setIsContainer] = useState(false);
    const [isItem, setIsItem] = useState(false);
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState(null);
    const [isSuggestingName, setIsSuggestingName] = useState(false);
    const [ai] = useSettings('ai', defaultSettings.ai);
    const isAiConfigured = Boolean(ai.keys?.[ai.provider]);
    const [transferOpen, setTransferOpen] = useState(false);
    const [packDialogOpen, setPackDialogOpen] = useState(false);
    const [unpackOpen, setUnpackOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    useEffect(() => {
        if (!location) return;
        setName(location.name);
        setType(location.type);
        setIcon(location.icon ?? null);
        setDescription(location.description ?? '');
        setIsFragile(location.is_fragile ?? false);
        setStorageOrientation(location.storage_orientation ?? '');
        setSentimentalValue(location.sentimental_value ?? null);
        setIsContainer(location.is_container ?? false);
        setIsItem(location.is_item ?? false);
        setCoords(location.lat != null ? { lat: location.lat, lng: location.lng } : null);
    }, [location]);

    const photos = useLocationPhotos({
        locationId: id,
        workspaceId: location?.workspace_id,
    });

    const { mutate: save, isPending: isSaving } = useMutation(
        updateLocationMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['location', id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['locations', updated.workspace_id, updated.parent_id],
                });
                queryClient.invalidateQueries({ queryKey: ['location-ancestors'] });
                router.push(`/location/${id}`);
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: destroy, isPending: isDeleting } = useMutation(
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

    // Same cycle guard as location/[id]/page.js — moving/unpacking a
    // location into itself or one of its own descendants would create a
    // parent_id loop (hangs ancestor walks and the price RPC's recursive CTE).
    const isDestinationSafe = async destinationId => {
        if (destinationId === id) return false;
        const descendantIds = await getLocationDescendantIds(id);
        return !descendantIds.includes(destinationId);
    };

    const handleTransfer = async newParentId => {
        if (!(await isDestinationSafe(newParentId))) {
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
        if (!(await isDestinationSafe(newParentId))) {
            await confirm({
                title: 'No puedes desempacar esta caja dentro de sí misma o de algo que contiene.',
                cancelLabel: null,
                confirmLabel: 'Entendido',
            });
            return;
        }
        unpack({ id, parentId: newParentId });
    };

    const isRoot = location?.parent_id == null;

    // is_item implies is_container (a rateable location always shows its
    // metadata too) — enforced here since turning is_item on has to force
    // is_container on right along with it, not just at submit time.
    const handleIsItemChange = value => {
        setIsItem(value);
        if (value) setIsContainer(true);
    };

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        save({
            id,
            name: name.trim(),
            type,
            icon,
            description: description.trim() || null,
            isFragile,
            storageOrientation: storageOrientation || null,
            sentimentalValue,
            isContainer,
            isItem,
            ...(isRoot && { lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
        });
    };

    const handleSuggestName = async () => {
        if (isSuggestingName) return;
        setIsSuggestingName(true);
        try {
            const contents = await getLocationContents(id);
            const suggestion = await generateLocationNameSuggestion(contents);
            setName(suggestion);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSuggestingName(false);
        }
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: `¿Eliminar "${location?.name}"?`,
            description: 'Esto no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: location?.name,
        });
        if (!ok) return;
        destroy(id);
    };

    if (isAuthLoading || !user || isLocationPending || !location || !workspace) {
        return <Loading />;
    }

    const previewIcon = getLocationIcon({ icon, type });
    // Only the workspace owner can delete a house (a root location, no
    // parent) — collaborators can still delete anything nested inside one.
    const isOwner = workspace.owner_id === user.id;
    const canDeleteLocation = !isRoot || isOwner;

    return (
        <div className='relative flex flex-1 flex-col gap-4 p-4 pb-12' data-block='LocationEditPage'>
            {isLocationPacked && (
                <PackedTapeTop moveId={packedMoveId} moveName={packedMove?.name} />
            )}
            <div className='flex items-center gap-1'>
                <Button
                    size='icon-sm'
                    variant='ghost'
                    render={<Link href={`/location/${id}`} aria-label='Regresar' />}
                >
                    <CaretLeftIcon />
                </Button>
                <LocationBreadcrumb
                    workspace={workspace}
                    ancestors={ancestors ?? []}
                    current={location}
                    currentIcon={previewIcon}
                    currentHref={`/location/${id}`}
                />
            </div>

            <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                <div
                    className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                    data-block='LocationEditHero'
                >
                    <div className='flex items-start gap-3'>
                        <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                            <DynamicIcon icon={previewIcon} />
                        </span>
                        <div className='min-w-0'>
                            <p className='truncate text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                                {type}
                            </p>
                            <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                                {name}
                            </h1>
                        </div>

                        <Button
                            size='icon-sm'
                            variant='outline'
                            aria-label='Compartir con QR'
                            className='ml-auto shrink-0 bg-card/70'
                            onClick={() => setShareOpen(true)}
                        >
                            <QrCodeIcon />
                        </Button>
                    </div>

                    {!isRoot && (
                        <>
                            <div className='h-1 bg-muted/50' />
                            <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                    disabled={isTransferring}
                                    onClick={() => setTransferOpen(true)}
                                >
                                    {isTransferring ? <Spinner /> : <ArrowsLeftRightIcon />}
                                    <span className='hidden sm:inline'>Transferir</span>
                                </Button>

                                {location.active_move_id ? (
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setUnpackOpen(true)}
                                    >
                                        <LucidePackageOpenIcon className='stroke-1' />
                                        <span className='hidden sm:inline'>Desempacar</span>
                                    </Button>
                                ) : (
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setPackDialogOpen(true)}
                                    >
                                        <LucidePackageIcon className='stroke-1' />
                                        <span className='hidden sm:inline'>Empacar</span>
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
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

                <ShareQrDialog
                    open={shareOpen}
                    onOpenChange={setShareOpen}
                    path={`/l/${id}`}
                    name={location.name}
                />

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='LocationIdentityCard'
                    >
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='location-name'>Nombre</FieldLabel>
                                <div className='flex items-center gap-2'>
                                    <IconPicker value={icon} onChange={setIcon}>
                                        <button
                                            type='button'
                                            aria-label='Elegir ícono'
                                            className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted [&_svg]:size-4'
                                        >
                                            <DynamicIcon icon={previewIcon} />
                                        </button>
                                    </IconPicker>
                                    <Input
                                        id='location-name'
                                        required
                                        value={name}
                                        onChange={event => setName(event.target.value)}
                                    />
                                    <SuggestNameButton
                                        isAiConfigured={isAiConfigured}
                                        isLoading={isSuggestingName}
                                        onClick={handleSuggestName}
                                    />
                                </div>
                            </Field>
                        </FieldGroup>
                    </div>

                    <div
                        className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                        data-block='LocationTypeCard'
                    >
                        <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Tipo y ubicación
                        </h2>
                        <FieldGroup>
                            <Field data-invalid={!!error}>
                                <FieldLabel>Tipo</FieldLabel>
                                <SelectSearch
                                    options={LOCATION_TYPE_PRESETS}
                                    value={type}
                                    onChange={setType}
                                    getKey={preset => preset}
                                    getLabel={preset => preset}
                                    searchPlaceholder='Buscar tipo'
                                    renderOption={preset => (
                                        <>
                                            <DynamicIcon icon={DEFAULT_LOCATION_ICONS[preset]} />
                                            <span className='capitalize'>{preset}</span>
                                        </>
                                    )}
                                />
                                <FieldError>{error}</FieldError>
                            </Field>

                            {isRoot && (
                                <Field>
                                    <FieldLabel>Ubicación en el mapa</FieldLabel>
                                    <LocationMapPicker
                                        value={coords}
                                        onChange={setCoords}
                                        workspaceId={location.workspace_id}
                                    />
                                </Field>
                            )}

                            <Field
                                orientation='horizontal'
                                className='rounded-lg border bg-muted/30 px-3 py-2.5'
                            >
                                <FieldLabel htmlFor='location-is-container' className='flex-1'>
                                    <PackageIcon className='text-muted-foreground' />
                                    Es un contenedor
                                </FieldLabel>
                                <Switch
                                    id='location-is-container'
                                    checked={isContainer}
                                    disabled={isItem}
                                    onCheckedChange={setIsContainer}
                                />
                            </Field>

                            <Field
                                orientation='horizontal'
                                className='rounded-lg border bg-muted/30 px-3 py-2.5'
                            >
                                <FieldLabel htmlFor='location-is-item' className='flex-1'>
                                    <CardsThreeIcon className='text-muted-foreground' />
                                    Aparece en el deck de calificar
                                </FieldLabel>
                                <Switch
                                    id='location-is-item'
                                    checked={isItem}
                                    onCheckedChange={handleIsItemChange}
                                />
                            </Field>
                        </FieldGroup>
                    </div>

                    {isContainer && (
                        <>
                            <div
                                className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                                data-block='LocationDetailsCard'
                            >
                                <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                    Detalles
                                </h2>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor='location-description'>
                                            Descripción
                                        </FieldLabel>
                                        <Textarea
                                            id='location-description'
                                            value={description}
                                            onChange={event =>
                                                setDescription(event.target.value)
                                            }
                                            placeholder='Opcional'
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel>Fotos</FieldLabel>
                                        <PhotoGallery
                                            photos={photos.photos}
                                            isProcessing={photos.isProcessing}
                                            onAddFiles={photos.addFiles}
                                            onRemove={photos.removePhoto}
                                            onUpdateCrop={photos.updateCrop}
                                            onReorder={photos.reorderPhotos}
                                        />
                                    </Field>
                                </FieldGroup>
                            </div>

                            <div
                                className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                                data-block='LocationClassificationCard'
                            >
                                <h2 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                    Clasificación
                                </h2>
                                <FieldGroup>
                                    <OptionDropdown
                                        label='Orientación de almacenaje'
                                        value={storageOrientation}
                                        onChange={setStorageOrientation}
                                        options={orientations}
                                    />
                                </FieldGroup>
                            </div>

                            <div
                                className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                                data-block='LocationExtrasCard'
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
                                        <FieldLabel htmlFor='location-fragile' className='flex-1'>
                                            <WarningIcon className='text-muted-foreground' />
                                            Es frágil
                                        </FieldLabel>
                                        <Switch
                                            id='location-fragile'
                                            checked={isFragile}
                                            onCheckedChange={setIsFragile}
                                        />
                                    </Field>
                                </FieldGroup>
                            </div>
                        </>
                    )}

                    {/* Repeats LocationIdentityCard's icon+name row, bound to
                    the same state — on a container location (photos,
                    classification, extras cards) the original is scrolled
                    well out of view by the time you reach the buttons below. */}
                    <div
                        className='flex items-center gap-2 rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'
                        data-block='LocationEditBottomIdentity'
                    >
                        <IconPicker value={icon} onChange={setIcon}>
                            <button
                                type='button'
                                aria-label='Elegir ícono'
                                className='flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted [&_svg]:size-4'
                            >
                                <DynamicIcon icon={previewIcon} />
                            </button>
                        </IconPicker>
                        <Input
                            id='location-name-bottom'
                            required
                            value={name}
                            onChange={event => setName(event.target.value)}
                            aria-label='Nombre'
                        />
                        <SuggestNameButton
                            isAiConfigured={isAiConfigured}
                            isLoading={isSuggestingName}
                            onClick={handleSuggestName}
                        />
                    </div>

                    <div className='flex flex-col gap-2 border-t pt-4 sm:flex-row'>
                        {canDeleteLocation && (
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
                        )}
                        <Button type='button' variant='outline' render={<Link href={`/location/${id}`} />}>
                            Cancelar
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
