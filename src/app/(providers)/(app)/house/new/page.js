'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { createLocationMutation } from '@/queries/locations';
import { SelectSearch } from '@/ui/select-search';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { DEFAULT_LOCATION_ICONS, ROOT_LOCATION_TYPE_PRESETS } from '@/constants/location-icons';

export default function NewHousePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const workspaceId = searchParams.get('workspace');
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const [name, setName] = useState('');
    const [type, setType] = useState('house');
    const [icon, setIcon] = useState(null);
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState(null);

    const { mutate, isPending } = useMutation(
        createLocationMutation({
            onSuccess: location => router.replace(`/location/${location.id}`),
            onError: err => setError(err.message),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim() || !workspaceId) return;
        mutate({
            workspaceId,
            parentId: null,
            name: name.trim(),
            type,
            icon: icon ?? DEFAULT_LOCATION_ICONS[type],
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
        });
    };

    const previewIcon = icon ?? DEFAULT_LOCATION_ICONS[type];

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='NewHousePage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='NewHouseHero'
            >
                <div className='flex items-center gap-3'>
                    <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-card/80 text-primary shadow-xs ring-1 ring-foreground/10 [&_svg]:size-5'>
                        <DynamicIcon icon={previewIcon} />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-xl font-semibold tracking-tight'>
                            Nueva casa
                        </h1>
                        <p className='text-sm text-muted-foreground'>
                            Registra tu primer espacio para empezar a organizar tu inventario.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='house-name'>Nombre</FieldLabel>
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
                                id='house-name'
                                autoFocus
                                required
                                value={name}
                                onChange={event => setName(event.target.value)}
                                placeholder='Ej. Casa principal'
                            />
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel>Tipo</FieldLabel>
                        <SelectSearch
                            options={ROOT_LOCATION_TYPE_PRESETS}
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
                    </Field>

                    <Field data-invalid={!!error}>
                        <FieldLabel>Ubicación en el mapa</FieldLabel>
                        <LocationMapPicker
                            value={coords}
                            onChange={setCoords}
                            workspaceId={workspaceId}
                        />
                        <FieldError>{error}</FieldError>
                    </Field>
                </FieldGroup>

                <Button type='submit' disabled={isPending || !name.trim()} className='w-full'>
                    {isPending && <Spinner data-icon='inline-start' />}
                    Crear casa
                </Button>
            </form>
        </div>
    );
}
