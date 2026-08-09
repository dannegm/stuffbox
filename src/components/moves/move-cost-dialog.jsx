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
import { Field, FieldLabel } from '@/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { updateMoveMutation } from '@/queries/moves';

const FORM_ID = 'move-cost-form';

export const MoveCostDialog = ({ move, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [cost, setCost] = useState('');

    useEffect(() => {
        if (!open) return;
        setCost(move?.cost != null ? String(move.cost) : '');
    }, [open, move?.cost]);

    const { mutate: update, isPending } = useMutation(
        updateMoveMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['move', move.id], updated);
                onOpenChange(false);
            },
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        update({ id: move.id, cost: cost === '' ? null : Number(cost) });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='MoveCostDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Costo de la mudanza</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <Field>
                        <FieldLabel htmlFor='move-cost'>Costo</FieldLabel>
                        <InputGroup>
                            <InputGroupAddon>
                                <InputGroupText>$</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                id='move-cost'
                                autoFocus
                                type='number'
                                inputMode='decimal'
                                min={0}
                                step='0.01'
                                value={cost}
                                onChange={event => setCost(event.target.value)}
                                placeholder='N/A'
                            />
                        </InputGroup>
                    </Field>
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={FORM_ID} disabled={isPending}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
