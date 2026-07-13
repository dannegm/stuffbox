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
import { RootLocationSelect } from '@/components/moves/root-location-select';
import { createMoveMutation } from '@/queries/moves';

const FORM_ID = 'move-form';

// Create-only — a move's origin/destination are fixed once packing starts
// against them, so there's no edit path for those two fields (name/status
// are editable in place from the move detail page instead).
export const MoveDialog = ({ workspaceId, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [originId, setOriginId] = useState('');
    const [destinationId, setDestinationId] = useState('');
    const [routeType, setRouteType] = useState('land');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setName('');
        setOriginId('');
        setDestinationId('');
        setRouteType('land');
        setError(null);
    }, [open]);

    const { mutate: create, isPending } = useMutation(
        createMoveMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['moves', workspaceId] });
                onOpenChange(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const isValid = name.trim() && originId && destinationId && originId !== destinationId;

    const handleSubmit = event => {
        event.preventDefault();
        if (!isValid) return;
        create({
            workspaceId,
            name: name.trim(),
            originLocationId: originId,
            destinationLocationId: destinationId,
            routeType,
        });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='MoveDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Nueva mudanza</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <div className='px-4 sm:px-0'>
                    <div
                        className='relative mb-4 flex items-center justify-center overflow-hidden rounded-xl bg-hero-mesh py-6 ring-1 ring-foreground/10'
                        data-block='MoveDialogHero'
                    >
                        <span
                            key={routeType}
                            className='flex size-14 items-center justify-center rounded-2xl bg-card text-flourish shadow-sm shadow-black/10 ring-1 ring-foreground/10 animate-in zoom-in-50 duration-300 [&_svg]:size-7'
                        >
                            {routeType === 'air' ? (
                                <AirplaneIcon weight='duotone' />
                            ) : (
                                <TruckIcon weight='duotone' />
                            )}
                        </span>
                    </div>
                </div>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='move-name'>Nombre</FieldLabel>
                            <Input
                                id='move-name'
                                autoFocus
                                required
                                value={name}
                                onChange={event => setName(event.target.value)}
                                placeholder='Ej. Mudanza a la casa nueva'
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Origen</FieldLabel>
                            <RootLocationSelect
                                workspaceId={workspaceId}
                                value={originId}
                                onChange={setOriginId}
                                placeholder='Elegir casa de origen'
                                exclude={destinationId}
                            />
                        </Field>

                        <Field>
                            <FieldLabel>Destino</FieldLabel>
                            <RootLocationSelect
                                workspaceId={workspaceId}
                                value={destinationId}
                                onChange={setDestinationId}
                                placeholder='Elegir casa de destino'
                                exclude={originId}
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
                        Crear mudanza
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
