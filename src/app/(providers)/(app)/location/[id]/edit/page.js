'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WarningIcon, CardsThreeIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import {
    locationQuery,
    locationAncestorsQuery,
    updateLocationMutation,
    deleteLocationMutation,
} from '@/queries/locations';
import { workspaceQuery } from '@/queries/workspaces';
import { optionListsQuery } from '@/queries/option-lists';
import { useLocationPhotos } from '@/hooks/use-location-photos';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
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
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { isContainerType, getLocationIcon } from '@/helpers/location';

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

    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [icon, setIcon] = useState(null);
    const [description, setDescription] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [storageOrientation, setStorageOrientation] = useState('');
    const [sentimentalValue, setSentimentalValue] = useState(null);
    const [isItem, setIsItem] = useState(false);
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!location) return;
        setName(location.name);
        setType(location.type);
        setIcon(location.icon ?? null);
        setDescription(location.description ?? '');
        setIsFragile(location.is_fragile ?? false);
        setStorageOrientation(location.storage_orientation ?? '');
        setSentimentalValue(location.sentimental_value ?? null);
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

    const isRoot = location?.parent_id == null;
    const isContainer = isContainerType(type);

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
            isItem,
            ...(isRoot && { lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
        });
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
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
                currentIcon={previewIcon}
            />

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
                    </div>
                </div>

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
                                <FieldLabel htmlFor='location-is-item' className='flex-1'>
                                    <CardsThreeIcon className='text-muted-foreground' />
                                    Aparece en el deck de calificar
                                </FieldLabel>
                                <Switch
                                    id='location-is-item'
                                    checked={isItem}
                                    onCheckedChange={setIsItem}
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
