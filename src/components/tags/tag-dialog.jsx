'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XIcon, CaretDownIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { ColorPicker } from '@/ui/color-picker';
import { IconPicker } from '@/ui/icon-picker';
import { IconMultiSelect } from '@/ui/icon-multi-select';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { createTagMutation, updateTagMutation } from '@/queries/tags';

const DEFAULT_COLOR = '#6366f1';
const FORM_ID = 'tag-form';

// Shared create/edit form — `tag` present means edit, absent means create.
// Controlled from the outside (no trigger of its own) — opened from a plain
// button/row action, not a menu item.
export const TagDialog = ({ workspaceId, tag, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [icon, setIcon] = useState(null);
    const [sku, setSku] = useState('');
    const [searchTerms, setSearchTerms] = useState([]);
    const [termInput, setTermInput] = useState('');
    const [relatedIcons, setRelatedIcons] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setName(tag?.name ?? '');
        setColor(tag?.color ?? DEFAULT_COLOR);
        setIcon(tag?.icon ?? null);
        setSku(tag?.sku ?? '');
        setSearchTerms(tag?.search_terms ?? []);
        setTermInput('');
        setRelatedIcons(tag?.related_icons ?? []);
        setError(null);
    }, [open, tag]);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] });

    const { mutate: create, isPending: isCreating } = useMutation(
        createTagMutation({
            onSuccess: () => {
                invalidate();
                onOpenChange(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const { mutate: update, isPending: isUpdating } = useMutation(
        updateTagMutation({
            onSuccess: () => {
                invalidate();
                onOpenChange(false);
            },
            onError: err => setError(err.message),
        }),
    );

    const isPending = isCreating || isUpdating;

    const handleAddTerm = () => {
        const value = termInput.trim();
        if (!value) return;
        if (!searchTerms.some(term => term.toLowerCase() === value.toLowerCase())) {
            setSearchTerms([...searchTerms, value]);
        }
        setTermInput('');
    };

    const handleTermInputKeyDown = event => {
        if (event.key !== 'Enter' && event.key !== ',') return;
        event.preventDefault();
        handleAddTerm();
    };

    const handleRemoveTerm = term => {
        setSearchTerms(searchTerms.filter(existing => existing !== term));
    };

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        const sanitizedSku = sku.trim() || null;
        if (tag) {
            update({
                id: tag.id,
                name: name.trim(),
                color,
                icon,
                sku: sanitizedSku,
                searchTerms,
                relatedIcons,
            });
        } else {
            create({
                workspaceId,
                name: name.trim(),
                color,
                icon,
                sku: sanitizedSku,
                searchTerms,
                relatedIcons,
            });
        }
    };

    const previewIcon = icon ?? FALLBACK_TAG_ICON;

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='TagDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>
                        {tag ? 'Editar tag' : 'Nuevo tag'}
                    </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field data-invalid={!!error}>
                            <FieldLabel htmlFor='tag-name'>Nombre</FieldLabel>
                            <div className='flex items-center gap-2'>
                                <IconPicker value={icon} onChange={setIcon}>
                                    <button
                                        type='button'
                                        aria-label='Elegir ícono'
                                        className='flex size-10 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-(--tag-color) shadow-xs transition-colors hover:border-(--tag-color)/40 hover:bg-(--tag-color)/10 [&_svg]:size-4.5'
                                        style={{ '--tag-color': color }}
                                    >
                                        <DynamicIcon icon={previewIcon} />
                                    </button>
                                </IconPicker>
                                <ColorPicker value={color} onChange={setColor}>
                                    <button
                                        type='button'
                                        aria-label='Elegir color'
                                        className='size-10 shrink-0 rounded-lg border border-input bg-(--tag-color) shadow-xs ring-1 ring-foreground/5 transition-transform hover:scale-105'
                                        style={{ '--tag-color': color }}
                                    />
                                </ColorPicker>
                                <Input
                                    id='tag-name'
                                    autoFocus
                                    required
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                    placeholder='Ej. Frágil'
                                />
                            </div>
                            <FieldError>{error}</FieldError>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='tag-sku'>SKU</FieldLabel>
                            <Input
                                id='tag-sku'
                                value={sku}
                                onChange={event => setSku(event.target.value)}
                                placeholder='Opcional'
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor='tag-search-term'>Términos de búsqueda</FieldLabel>
                            <FieldDescription>
                                Este tag también aparecerá si buscas por estos términos — ej. el
                                tag "Instrumentos" con el término "música".
                            </FieldDescription>
                            <Input
                                id='tag-search-term'
                                value={termInput}
                                onChange={event => setTermInput(event.target.value)}
                                onKeyDown={handleTermInputKeyDown}
                                onBlur={handleAddTerm}
                                placeholder='Escribe y presiona Enter'
                            />
                            {searchTerms.length > 0 && (
                                <div className='flex flex-wrap gap-1.5 pt-1'>
                                    {searchTerms.map(term => (
                                        <span
                                            key={term}
                                            className='flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                                        >
                                            {term}
                                            <button
                                                type='button'
                                                aria-label={`Quitar "${term}"`}
                                                onClick={() => handleRemoveTerm(term)}
                                                className='rounded-full hover:text-foreground [&_svg]:size-3'
                                            >
                                                <XIcon />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </Field>

                        <Field>
                            <FieldLabel>Íconos relacionados</FieldLabel>
                            <FieldDescription>
                                Se sugieren junto con el ícono del tag cuando eliges el ícono de un
                                item que tenga este tag.
                            </FieldDescription>
                            <ResponsivePopover>
                                <ResponsivePopoverTrigger
                                    render={
                                        <button
                                            type='button'
                                            className='flex min-h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-left text-sm shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted'
                                        />
                                    }
                                >
                                    {relatedIcons.length === 0 ? (
                                        <span className='text-muted-foreground'>
                                            Elegir íconos relacionados
                                        </span>
                                    ) : (
                                        <span className='flex flex-1 flex-wrap items-center gap-1'>
                                            {relatedIcons.map(relatedIcon => (
                                                <span
                                                    key={`${relatedIcon.library}:${relatedIcon.name}`}
                                                    className='flex size-6 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5'
                                                >
                                                    <DynamicIcon icon={relatedIcon} />
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                    <CaretDownIcon className='ml-auto size-3.5 shrink-0 text-muted-foreground' />
                                </ResponsivePopoverTrigger>
                                <ResponsivePopoverContent className='w-96 gap-2 p-2' align='start'>
                                    <IconMultiSelect value={relatedIcons} onChange={setRelatedIcons} />
                                </ResponsivePopoverContent>
                            </ResponsivePopover>
                        </Field>

                        <div className='flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-3'>
                            <span className='text-xs text-muted-foreground'>Vista previa</span>
                            <span
                                className='flex items-center gap-1.5 rounded-full bg-(--tag-color)/15 px-2.5 py-1 text-xs font-medium text-(--tag-color) ring-1 ring-(--tag-color)/20'
                                style={{ '--tag-color': color }}
                            >
                                <DynamicIcon icon={previewIcon} className='size-3.5' />
                                {name.trim() || 'Nombre del tag'}
                            </span>
                        </div>
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
