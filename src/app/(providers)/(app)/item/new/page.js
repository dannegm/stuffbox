'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { WarningDiamondIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { locationQuery } from '@/queries/locations';
import { createItemMutation } from '@/queries/items';
import { optionListsQuery } from '@/queries/option-lists';
import { OptionDropdown } from '@/components/items/option-dropdown';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { IconPicker } from '@/ui/icon-picker';
import { FALLBACK_ITEM_ICON } from '@/constants/location-icons';

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

    const { data: conditions } = useQuery(
        optionListsQuery(location?.workspace_id, 'condition', { enabled: !!location }),
    );
    const { data: orientations } = useQuery(
        optionListsQuery(location?.workspace_id, 'orientation', { enabled: !!location }),
    );

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [condition, setCondition] = useState('');
    const [storageOrientation, setStorageOrientation] = useState('');
    const [isFragile, setIsFragile] = useState(false);
    const [icon, setIcon] = useState(null);
    const [error, setError] = useState(null);

    const resetForm = () => {
        setName('');
        setDescription('');
        setQuantity(1);
        setCondition('');
        setStorageOrientation('');
        setIsFragile(false);
        setIcon(null);
    };

    const { mutate, isPending } = useMutation(
        createItemMutation({
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
        };
    };

    const handleDiscard = () => {
        router.replace(`/location/${locationId}`);
    };

    const handleSaveAndFinish = event => {
        event.preventDefault();
        const variables = buildVariables();
        if (!variables) return;
        mutate(variables, { onSuccess: item => router.replace(`/item/${item.id}`) });
    };

    const handleSaveAndCreateAnother = () => {
        const variables = buildVariables();
        if (!variables) return;
        mutate(variables, { onSuccess: resetForm });
    };

    if (isAuthLoading || !user || isLocationPending || !location) {
        return (
            <div className='flex flex-1 items-center justify-center' data-block='NewItemLoading'>
                <Spinner className='size-6' />
            </div>
        );
    }

    const previewIcon = icon ?? FALLBACK_ITEM_ICON;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='NewItemPage'
        >
            <div>
                <h1 className='font-heading text-lg font-medium'>Nuevo item</h1>
                <p className='text-sm text-muted-foreground'>Se guarda en {location.name}.</p>
            </div>

            <form onSubmit={handleSaveAndFinish} className='flex flex-col gap-4'>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='item-name'>Nombre</FieldLabel>
                        <div className='flex items-center gap-2'>
                            <IconPicker value={icon} onChange={setIcon}>
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
                                autoFocus
                                required
                                value={name}
                                onChange={event => setName(event.target.value)}
                                placeholder='Ej. Taladro'
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
                        variant='ghost'
                        disabled={isPending}
                        onClick={handleDiscard}
                        className='sm:mr-auto'
                    >
                        Terminar sin guardar
                    </Button>
                    <Button type='submit' variant='outline' disabled={isPending || !name.trim()}>
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
    );
}
