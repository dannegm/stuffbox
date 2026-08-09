'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { XIcon, CaretDownIcon, SparkleIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { createTagMutation } from '@/queries/tags';
import { generateTagSuggestions } from '@/services/tag-suggestions';
import { useSettings } from '@/hooks/use-settings';
import { defaultSettings } from '@/constants/default-settings';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { ColorPicker } from '@/ui/color-picker';
import { IconPicker } from '@/ui/icon-picker';
import { IconMultiSelect } from '@/ui/icon-multi-select';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';

const DEFAULT_COLOR = '#6366f1';
const iconKey = icon => `${icon.library}:${icon.name}`;

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='TagFormLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='h-56 w-full rounded-xl' />
    </div>
);

export default function NewTagPage() {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_COLOR);
    const [icon, setIcon] = useState(null);
    const [sku, setSku] = useState('');
    const [searchTerms, setSearchTerms] = useState([]);
    const [termInput, setTermInput] = useState('');
    const [relatedIcons, setRelatedIcons] = useState([]);
    const [error, setError] = useState(null);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [ai] = useSettings('ai', defaultSettings.ai);
    const isAiConfigured = Boolean(ai.keys?.[ai.provider]);

    const { mutate: create, isPending: isSaving } = useMutation(
        createTagMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['tags', workspace.id] });
                router.push('/tags');
            },
            onError: err => setError(err.message),
        }),
    );

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

    // Adds to whatever's already there instead of replacing it — the button
    // is meant to help fill in the form, not discard terms/icons the user
    // already entered by hand.
    const handleGenerateSuggestions = async () => {
        if (!name.trim() || isGeneratingSuggestions) return;
        setIsGeneratingSuggestions(true);
        try {
            const result = await generateTagSuggestions({ name: name.trim(), icon });

            setSearchTerms(prev => {
                const existing = new Set(prev.map(term => term.toLowerCase()));
                const additions = result.searchTerms.filter(
                    term => !existing.has(term.toLowerCase()),
                );
                return [...prev, ...additions];
            });

            setRelatedIcons(prev => {
                const existing = new Set(prev.map(iconKey));
                const additions = result.relatedIcons.filter(
                    candidate => !existing.has(iconKey(candidate)),
                );
                return [...prev, ...additions];
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim() || !workspace) return;
        create({
            workspaceId: workspace.id,
            name: name.trim(),
            color,
            icon,
            sku: sku.trim() || null,
            searchTerms,
            relatedIcons,
        });
    };

    if (isAuthLoading || !user || isWorkspacesPending || !workspace) {
        return <Loading />;
    }

    const previewIcon = icon ?? FALLBACK_TAG_ICON;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-12'
            data-block='NewTagPage'
        >
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='TagFormHero'
            >
                <div className='flex items-center gap-3'>
                    <span
                        className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-(--tag-color) shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5'
                        style={{ '--tag-color': color }}
                    >
                        <DynamicIcon icon={previewIcon} />
                    </span>
                    <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                        Nuevo tag
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <div
                    className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                    data-block='TagIdentityCard'
                >
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
                                inputMode='numeric'
                                value={sku}
                                onChange={event => setSku(event.target.value)}
                                placeholder='Opcional'
                            />
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
                </div>

                <div
                    className='rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                    data-block='TagSmartSearchCard'
                >
                    <div className='mb-3 flex items-center justify-between gap-2'>
                        <h2 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                            Búsqueda inteligente
                        </h2>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        disabled={
                                            !name.trim() || !isAiConfigured || isGeneratingSuggestions
                                        }
                                        onClick={handleGenerateSuggestions}
                                    />
                                }
                            >
                                {isGeneratingSuggestions ? (
                                    <Spinner data-icon='inline-start' />
                                ) : (
                                    <SparkleIcon data-icon='inline-start' />
                                )}
                                Generar sugerencias con IA
                            </TooltipTrigger>
                            <TooltipContent>
                                {isAiConfigured
                                    ? 'Sugiere términos de búsqueda e íconos relacionados a partir del nombre y el ícono del tag.'
                                    : 'Configura tu proveedor de IA en tu perfil primero.'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <FieldGroup>
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
                                                    key={iconKey(relatedIcon)}
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
                                    <IconMultiSelect
                                        value={relatedIcons}
                                        onChange={setRelatedIcons}
                                    />
                                </ResponsivePopoverContent>
                            </ResponsivePopover>
                        </Field>
                    </FieldGroup>
                </div>

                <div className='flex flex-col gap-2 border-t pt-4 sm:flex-row'>
                    <Button type='button' variant='outline' render={<Link href='/tags' />}>
                        Cancelar
                    </Button>
                    <Button
                        type='submit'
                        disabled={isSaving || !name.trim()}
                        className='sm:ml-auto'
                    >
                        {isSaving && <Spinner data-icon='inline-start' />}
                        Crear tag
                    </Button>
                </div>
            </form>
        </div>
    );
}
