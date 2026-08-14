'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from '@/ui/responsive-dialog';
import { CardsThreeIcon, PackageIcon } from '@phosphor-icons/react/ssr';
import { SelectSearch } from '@/ui/select-search';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { isContainerType } from '@/helpers/location';
import { createLocationMutation } from '@/queries/locations';

const FORM_ID = 'create-location-form';

// Shared by the workspace page (creating houses, parentId null) and the
// location page (creating children) — same insert, only parentId changes.
export const CreateLocationDialog = ({ workspaceId, parentId = null, title, children }) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState(LOCATION_TYPE_PRESETS[0]);
    const [isContainer, setIsContainer] = useState(isContainerType(LOCATION_TYPE_PRESETS[0]));
    const [isContainerTouched, setIsContainerTouched] = useState(false);
    const [isItem, setIsItem] = useState(false);
    const [error, setError] = useState(null);

    // box/shelf/toolbox/baggage start as containers automatically — but once
    // the user manually flips the switch, their choice wins over further type
    // changes. is_item has no type-based default — it's always an explicit
    // opt-in, independent of type.
    const handleTypeChange = newType => {
        setType(newType);
        if (!isContainerTouched) setIsContainer(isContainerType(newType));
    };

    const handleIsContainerChange = value => {
        setIsContainer(value);
        setIsContainerTouched(true);
    };

    // is_item implies is_container (a rateable location always shows its
    // metadata too) — enforced here since turning is_item on has to force
    // is_container on right along with it, not just at submit time.
    const handleIsItemChange = value => {
        setIsItem(value);
        if (value) {
            setIsContainer(true);
            setIsContainerTouched(true);
        }
    };

    const { mutate, isPending } = useMutation(
        createLocationMutation({
            onSuccess: location => {
                queryClient.invalidateQueries({ queryKey: ['locations', workspaceId, parentId] });
                setName('');
                setType(LOCATION_TYPE_PRESETS[0]);
                setIsContainer(isContainerType(LOCATION_TYPE_PRESETS[0]));
                setIsContainerTouched(false);
                setIsItem(false);
                setError(null);
                setOpen(false);
                // Stays put (this dialog is opened from wherever it already
                // was — house list, a parent location) rather than
                // navigating away on its own, so the toast is the only way
                // to actually jump into the thing that was just created.
                toast.success(`"${location.name}" creada`, {
                    action: {
                        label: 'Ver',
                        onClick: () => router.push(`/location/${location.id}`),
                    },
                });
            },
            onError: err => setError(err.message),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({ workspaceId, parentId, name: name.trim(), type, isContainer, isItem });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={setOpen}>
            <ResponsiveDialogTrigger render={children} />
            <ResponsiveDialogContent data-block='CreateLocationDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Agrega un nuevo lugar dentro de tu inventario.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0 sm:pt-0 sm:pb-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='location-name'>Nombre</FieldLabel>
                            <div className='flex items-center gap-2'>
                                <span className='flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-primary/30 bg-primary/10 text-primary [&_svg]:size-4'>
                                    <DynamicIcon icon={DEFAULT_LOCATION_ICONS[type]} />
                                </span>
                                <Input
                                    id='location-name'
                                    autoFocus
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                    placeholder='Ej. Casa principal'
                                />
                            </div>
                        </Field>
                        <Field data-invalid={!!error}>
                            <FieldLabel>Tipo</FieldLabel>
                            <SelectSearch
                                options={LOCATION_TYPE_PRESETS}
                                value={type}
                                onChange={handleTypeChange}
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
                                onCheckedChange={handleIsContainerChange}
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
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={FORM_ID} disabled={isPending || !name.trim()}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Crear
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
