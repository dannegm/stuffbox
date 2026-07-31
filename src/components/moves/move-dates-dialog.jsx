'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { DatePicker } from '@/ui/date-picker';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { updateMoveMutation } from '@/queries/moves';

const FORM_ID = 'move-dates-form';

const today = () => new Date().toISOString().slice(0, 10);

// Shown once, the moment a move first switches to in_transit — started_at
// gates this (see move/[id]/page.js's handleStatusChange), so re-entering
// in_transit later never re-prompts and never overwrites the original dates.
export const MoveDatesDialog = ({ move, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [startedAt, setStartedAt] = useState('');
    const [estimatedCompletionAt, setEstimatedCompletionAt] = useState('');

    useEffect(() => {
        if (!open) return;
        setStartedAt(today());
        setEstimatedCompletionAt('');
    }, [open]);

    const { mutate: update, isPending } = useMutation(
        updateMoveMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['move', move.id], updated);
                onOpenChange(false);
            },
        }),
    );

    const isValid = !!startedAt;

    const handleSubmit = event => {
        event.preventDefault();
        if (!isValid) return;
        update({
            id: move.id,
            status: 'in_transit',
            startedAt,
            estimatedCompletionAt: estimatedCompletionAt || null,
        });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='MoveDatesDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Fechas de la mudanza</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Se usan para calcular el progreso y avisar si se retrasa.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='move-started-at'>Fecha de inicio</FieldLabel>
                            <DatePicker
                                id='move-started-at'
                                value={startedAt}
                                onChange={setStartedAt}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='move-estimated-completion-at'>
                                Fecha límite (opcional)
                            </FieldLabel>
                            <DatePicker
                                id='move-estimated-completion-at'
                                min={startedAt || undefined}
                                value={estimatedCompletionAt}
                                onChange={setEstimatedCompletionAt}
                                clearable
                            />
                        </Field>
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
