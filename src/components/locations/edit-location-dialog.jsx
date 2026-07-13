'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WarningDiamondIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { SelectSearch } from '@/ui/select-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { HeartRating } from '@/ui/heart-rating';
import { PhotoGallery } from '@/ui/photo-gallery';
import { Field, FieldGroup, FieldLabel, FieldError, FieldSeparator } from '@/ui/field';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { isContainerType, getLocationIcon } from '@/helpers/location';
import { updateLocationMutation } from '@/queries/locations';
import { optionListsQuery } from '@/queries/option-lists';
import { useLocationPhotos } from '@/hooks/use-location-photos';

const FORM_ID = 'edit-location-form';

// Controlled from the outside (no trigger of its own) — this is opened from
// a DropdownMenuItem, and nesting a dialog trigger inside a menu item races
// with the menu's own close-on-click (same reasoning as the workspace
// switcher's "crear nuevo").
export const EditLocationDialog = ({ location, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState(location.name);
    const [type, setType] = useState(location.type);
    const [icon, setIcon] = useState(location.icon ?? null);
    const [description, setDescription] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [storageOrientation, setStorageOrientation] = useState('');
    const [sentimentalValue, setSentimentalValue] = useState(null);
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState(null);

    const isRoot = location.parent_id == null;

    // Re-sync from the (possibly stale-closed) location whenever the dialog
    // reopens, rather than trying to keep local state live the whole time.
    useEffect(() => {
        if (!open) return;
        setName(location.name);
        setType(location.type);
        setIcon(location.icon ?? null);
        setDescription(location.description ?? '');
        setIsFragile(location.is_fragile ?? false);
        setStorageOrientation(location.storage_orientation ?? '');
        setSentimentalValue(location.sentimental_value ?? null);
        setCoords(location.lat != null ? { lat: location.lat, lng: location.lng } : null);
        setError(null);
    }, [open, location]);

    const { data: orientations } = useQuery(
        optionListsQuery(location.workspace_id, 'orientation', { enabled: open }),
    );
    const photos = useLocationPhotos({
        locationId: location.id,
        workspaceId: location.workspace_id,
    });

    const { mutate, isPending } = useMutation(
        updateLocationMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['location', updated.id], updated);
                queryClient.invalidateQueries({
                    queryKey: ['locations', updated.workspace_id, updated.parent_id],
                });
                queryClient.invalidateQueries({ queryKey: ['location-ancestors'] });
                onOpenChange(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({
            id: location.id,
            name: name.trim(),
            type,
            icon,
            description: description.trim() || null,
            isFragile,
            storageOrientation: storageOrientation || null,
            sentimentalValue,
            ...(isRoot && { lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
        });
    };

    const isContainer = isContainerType(type);
    const previewIcon = getLocationIcon({ icon, type });

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='EditLocationDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Editar</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Actualiza los detalles de este lugar.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0 sm:pt-0 sm:pb-0'>
                    {/* The container fields (photos, orientation, etc.) can make this
                    tall enough to overflow the dialog/drawer viewport — cap and scroll
                    it locally instead of touching the shared ResponsiveDialog primitive. */}
                    <div className='max-h-[60vh] overflow-y-auto'>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='edit-location-name'>Nombre</FieldLabel>
                                <div className='flex items-center gap-2'>
                                    <IconPicker value={icon} onChange={setIcon}>
                                        <button
                                            type='button'
                                            aria-label='Elegir ícono'
                                            className='flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/15 [&_svg]:size-4'
                                        >
                                            <DynamicIcon icon={previewIcon} />
                                        </button>
                                    </IconPicker>
                                    <Input
                                        id='edit-location-name'
                                        autoFocus
                                        value={name}
                                        onChange={event => setName(event.target.value)}
                                    />
                                </div>
                            </Field>
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

                            {isContainer && (
                                <>
                                    <FieldSeparator>Detalles del contenedor</FieldSeparator>

                                    <Field>
                                        <FieldLabel htmlFor='edit-location-description'>
                                            Descripción
                                        </FieldLabel>
                                        <Textarea
                                            id='edit-location-description'
                                            value={description}
                                            onChange={event => setDescription(event.target.value)}
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
                                        />
                                    </Field>

                                    <OptionDropdown
                                        label='Orientación de almacenaje'
                                        value={storageOrientation}
                                        onChange={setStorageOrientation}
                                        options={orientations}
                                    />

                                    <Field>
                                        <FieldLabel>Valor sentimental</FieldLabel>
                                        <HeartRating
                                            value={sentimentalValue}
                                            onChange={setSentimentalValue}
                                        />
                                    </Field>

                                    <Field orientation='horizontal'>
                                        <FieldLabel
                                            htmlFor='edit-location-fragile'
                                            className='flex-1'
                                        >
                                            <WarningDiamondIcon className='text-muted-foreground' />
                                            Es frágil
                                        </FieldLabel>
                                        <Switch
                                            id='edit-location-fragile'
                                            checked={isFragile}
                                            onCheckedChange={setIsFragile}
                                        />
                                    </Field>
                                </>
                            )}
                        </FieldGroup>
                    </div>
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={FORM_ID} disabled={isPending || !name.trim()}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
