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
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { DatePicker } from '@/ui/date-picker';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { updateMoveMutation } from '@/queries/moves';

const FORM_ID = 'move-dates-edit-form';

// Free-form editing of all three date fields, any time — unlike
// MoveDatesDialog (the one-shot prompt gating the in_transit transition),
// this never touches status, so it's safe to open from the Fechas summary
// box whenever the owner wants to correct or backfill a date.
export const MoveDatesEditDialog = ({ move, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [startedAt, setStartedAt] = useState('');
    const [estimatedCompletionAt, setEstimatedCompletionAt] = useState('');
    const [completedAt, setCompletedAt] = useState('');

    useEffect(() => {
        if (!open) return;
        setStartedAt(move?.started_at ?? '');
        setEstimatedCompletionAt(move?.estimated_completion_at ?? '');
        setCompletedAt(move?.completed_at ?? '');
    }, [open, move]);

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
        update({
            id: move.id,
            startedAt: startedAt || null,
            estimatedCompletionAt: estimatedCompletionAt || null,
            completedAt: completedAt || null,
        });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='MoveDatesEditDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Fechas de la mudanza</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='move-dates-edit-started-at'>
                                Fecha de inicio
                            </FieldLabel>
                            <DatePicker
                                id='move-dates-edit-started-at'
                                value={startedAt}
                                onChange={setStartedAt}
                                clearable
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='move-dates-edit-estimated-completion-at'>
                                Fecha límite
                            </FieldLabel>
                            <DatePicker
                                id='move-dates-edit-estimated-completion-at'
                                min={startedAt || undefined}
                                value={estimatedCompletionAt}
                                onChange={setEstimatedCompletionAt}
                                clearable
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='move-dates-edit-completed-at'>
                                Fecha de finalización
                            </FieldLabel>
                            <DatePicker
                                id='move-dates-edit-completed-at'
                                min={startedAt || undefined}
                                value={completedAt}
                                onChange={setCompletedAt}
                                clearable
                            />
                        </Field>
                    </FieldGroup>
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
