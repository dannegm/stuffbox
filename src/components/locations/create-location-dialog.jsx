'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from '@/ui/responsive-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { createLocationMutation } from '@/queries/locations';

const FORM_ID = 'create-location-form';

// Shared by the workspace page (creating houses, parentId null) and the
// location page (creating children) — same insert, only parentId changes.
export const CreateLocationDialog = ({ workspaceId, parentId = null, title, children }) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState(LOCATION_TYPE_PRESETS[0]);
    const [error, setError] = useState(null);

    const { mutate, isPending } = useMutation(
        createLocationMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['locations', workspaceId, parentId] });
                setName('');
                setType(LOCATION_TYPE_PRESETS[0]);
                setError(null);
                setOpen(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({ workspaceId, parentId, name: name.trim(), type });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={setOpen}>
            <ResponsiveDialogTrigger render={children} />
            <ResponsiveDialogContent data-block='CreateLocationDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0 sm:pt-0 sm:pb-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='location-name'>Nombre</FieldLabel>
                            <Input
                                id='location-name'
                                autoFocus
                                value={name}
                                onChange={event => setName(event.target.value)}
                                placeholder='Ej. Casa principal'
                            />
                        </Field>
                        <Field data-invalid={!!error}>
                            <FieldLabel>Tipo</FieldLabel>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button
                                            type='button'
                                            variant='outline'
                                            className='w-full justify-between capitalize'
                                        />
                                    }
                                >
                                    <span className='flex items-center gap-2'>
                                        <DynamicIcon icon={DEFAULT_LOCATION_ICONS[type]} />
                                        {type}
                                    </span>
                                    <HugeiconsIcon
                                        icon={UnfoldMoreIcon}
                                        className='text-muted-foreground'
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className='w-56'>
                                    {LOCATION_TYPE_PRESETS.map(preset => (
                                        <DropdownMenuItem
                                            key={preset}
                                            className='capitalize'
                                            onClick={() => setType(preset)}
                                        >
                                            <DynamicIcon icon={DEFAULT_LOCATION_ICONS[preset]} />
                                            {preset}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <FieldError>{error}</FieldError>
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
