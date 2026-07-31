'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TruckIcon, AirplaneIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { updateMoveMutation } from '@/queries/moves';

const FORM_ID = 'move-edit-form';

// Editing here is deliberately name + route type only — origin/destination
// stay fixed once a move exists (see move-dialog.jsx's comment), and status
// has its own SelectSearch on the move detail page.
export const MoveEditDialog = ({ move, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [routeType, setRouteType] = useState('land');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setName(move?.name ?? '');
        setRouteType(move?.route_type ?? 'land');
        setError(null);
    }, [open, move]);

    const { mutate: update, isPending } = useMutation(
        updateMoveMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['move', move.id], updated);
                onOpenChange(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const isValid = name.trim();

    const handleSubmit = event => {
        event.preventDefault();
        if (!isValid) return;
        update({ id: move.id, name: name.trim(), routeType });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='MoveEditDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Editar mudanza</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='move-edit-name'>Nombre</FieldLabel>
                            <Input
                                id='move-edit-name'
                                autoFocus
                                required
                                value={name}
                                onChange={event => setName(event.target.value)}
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Tipo de ruta</FieldLabel>
                            <Tabs value={routeType} onValueChange={setRouteType}>
                                <TabsList className='w-full'>
                                    <TabsTrigger value='land' className='flex-1'>
                                        <TruckIcon data-icon='inline-start' />
                                        Terrestre
                                    </TabsTrigger>
                                    <TabsTrigger value='air' className='flex-1'>
                                        <AirplaneIcon data-icon='inline-start' />
                                        Aérea
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </Field>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={FORM_ID} disabled={isPending || !isValid}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
