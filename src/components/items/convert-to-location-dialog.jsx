'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
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
} from '@/ui/responsive-dialog';
import { SelectSearch } from '@/ui/select-search';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/ui/field';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { LOCATION_TYPE_PRESETS, DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { convertItemToLocationMutation } from '@/queries/items';

const FORM_ID = 'convert-to-location-form';

// "Promote an item to a location" — item edit screen action. Only the type
// is asked for here; everything else compatible (name, icon, photos,
// description, fragile, orientation, sentimental value) rides along
// untouched via convert_item_to_location (db.sql), which also deletes the
// item once the location + its photos exist. Tags don't carry over — there's
// no location_tags equivalent.
//
// Controlled (open/onOpenChange from the caller) rather than owning its own
// trigger, because it's opened from inside the item page's "…" overflow
// menu — nesting a dialog trigger inside a menu item races with the menu's
// own close-on-click (same reasoning as CreateWorkspaceDialog in
// workspace-switcher.jsx), so the menu item just flips this dialog's open
// state instead of triggering it directly.
export const ConvertToLocationDialog = ({
    item,
    workspaceId,
    parentLocationId,
    open,
    onOpenChange,
}) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    // Defaults to 'box' rather than LOCATION_TYPE_PRESETS[0] ('house') — the
    // common case for a promoted item is becoming a container, not a root.
    const [type, setType] = useState('box');
    const [error, setError] = useState(null);

    const { mutate, isPending } = useMutation(
        convertItemToLocationMutation({
            onSuccess: location => {
                queryClient.invalidateQueries({
                    queryKey: ['items', 'by-location', parentLocationId],
                });
                queryClient.invalidateQueries({
                    queryKey: ['locations', workspaceId, parentLocationId],
                });
                queryClient.removeQueries({ queryKey: ['item', item.id] });
                setError(null);
                onOpenChange(false);
                router.replace(`/location/${parentLocationId}`);
                toast.success(`"${location.name}" ahora es una ubicación`, {
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
        mutate({
            itemId: item.id,
            locationId: nanoid(8),
            type,
        });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='ConvertToLocationDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Convertir "{item.name}" en ubicación</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Se convierte en un lugar donde puedes guardar otras cosas, sin salir de
                        donde ya está. Los tags que tenía no se conservan y esta acción es
                        permanente.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <form
                    id={FORM_ID}
                    onSubmit={handleSubmit}
                    className='px-4 sm:px-0 sm:pt-0 sm:pb-0'
                >
                    <FieldGroup>
                        <Field data-invalid={!!error}>
                            <FieldLabel>Tipo de ubicación</FieldLabel>
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
                            <FieldDescription>
                                El nuevo lugar siempre podrá contener otras cosas dentro, sin
                                importar el tipo que elijas.
                            </FieldDescription>
                            <FieldError>{error}</FieldError>
                        </Field>
                    </FieldGroup>
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={FORM_ID} disabled={isPending}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Convertir
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
