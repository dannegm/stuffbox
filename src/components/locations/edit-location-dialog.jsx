'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { SelectSearch } from '@/ui/select-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { updateLocationMutation } from '@/queries/locations';

const FORM_ID = 'edit-location-form';

// Controlled from the outside (no trigger of its own) — this is opened from
// a DropdownMenuItem, and nesting a dialog trigger inside a menu item races
// with the menu's own close-on-click (same reasoning as the workspace
// switcher's "crear nuevo").
export const EditLocationDialog = ({ location, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState(location.name);
    const [type, setType] = useState(location.type);
    const [error, setError] = useState(null);

    // Re-sync from the (possibly stale-closed) location whenever the dialog
    // reopens, rather than trying to keep local state live the whole time.
    useEffect(() => {
        if (!open) return;
        setName(location.name);
        setType(location.type);
        setError(null);
    }, [open, location]);

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
        mutate({ id: location.id, name: name.trim(), type });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='EditLocationDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Editar</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0 sm:pt-0 sm:pb-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='edit-location-name'>Nombre</FieldLabel>
                            <Input
                                id='edit-location-name'
                                autoFocus
                                value={name}
                                onChange={event => setName(event.target.value)}
                            />
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
                    </FieldGroup>
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
