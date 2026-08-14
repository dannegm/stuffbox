'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ArrowCounterClockwiseIcon,
    CaretLeftIcon,
    GearSixIcon,
    SignOutIcon,
    TrashIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { usePageTitle } from '@/hooks/use-page-title';
import {
    workspaceQuery,
    updateWorkspaceMutation,
    deleteWorkspaceMutation,
} from '@/queries/workspaces';
import { workspaceSettingQuery, setWorkspaceSettingMutation } from '@/queries/workspace-settings';
import { removeWorkspaceMemberMutation } from '@/queries/collaborators';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { DEFAULT_LABEL_LAYOUT, PAGE_SIZES } from '@/helpers/label-layout';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { DeckLocationFilter } from '@/components/deck/deck-location-filter';
import { LabelLayoutPreview } from '@/components/moves/label-layout-preview';
import { LabelLayoutPreviewDialog } from '@/components/moves/label-layout-preview-dialog';
import { ColorPicker } from '@/ui/color-picker';
import { Field, FieldGroup, FieldContent, FieldLabel, FieldDescription } from '@/ui/field';
import { SelectSearch } from '@/ui/select-search';
import { Input } from '@/ui/input';
import { NumberScrubber } from '@/ui/number-scrubber';
import { StepperInput } from '@/ui/stepper-input';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { cn } from '@/helpers/utils';

// LocationMapPicker only hands back {lat,lng} (no zoom control) — fixed here
// rather than adding a zoom picker just for this one workspace-level default.
const DEFAULT_ZOOM = 14;

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='WorkspaceSettingsLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <div className='flex flex-col gap-4'>
            <Skeleton className='h-9 w-full rounded-md' />
            <Skeleton className='h-48 w-full rounded-lg' />
            <Skeleton className='h-9 w-24 rounded-md' />
        </div>
    </div>
);

// A plain labeled card — matches the Preferencias/Sesión sections on the
// profile page, so form groups here read as one grouped page too.
const SectionCard = ({ label, children }) => (
    <div
        className='flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
        data-block='WorkspaceSettingsSectionCard'
    >
        <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            {label}
        </h2>
        {children}
    </div>
);

export default function WorkspaceSettingsPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const confirm = useConfirm();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspace, isPending: isWorkspacePending } = useQuery(
        workspaceQuery(id, { enabled: !!user }),
    );
    usePageTitle(['Ajustes', workspace?.name]);
    const { data: mapDefault, isPending: isMapDefaultPending } = useQuery(
        workspaceSettingQuery(id, 'mapDefaultViewport', { enabled: !!user }),
    );
    const { data: collaborationSettings, isPending: isCollabPending } = useQuery(
        workspaceSettingQuery(id, 'collaborationSettings', { enabled: !!user }),
    );
    const { data: deckDefaultLocationId, isPending: isDeckDefaultPending } = useQuery(
        workspaceSettingQuery(id, 'deckDefaultLocationId', { enabled: !!user }),
    );
    const { data: labelLayoutSettings, isPending: isLabelLayoutPending } = useQuery(
        workspaceSettingQuery(id, 'labelLayoutSettings', { enabled: !!user }),
    );

    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [center, setCenter] = useState(null);
    // The deck (Cards) opens scoped to this by default for everyone — same
    // key `/deck` reads (workspaceSettingQuery(id, 'deckDefaultLocationId')).
    // Anyone can still change the filter locally on the deck page itself;
    // that change is never written back here (see DeckPage's own state).
    const [deckDefault, setDeckDefault] = useState(null);
    // Both default false — a workspace with no 'collaborationSettings' row
    // yet (the common case, nothing seeds it) resolves to null, same as the
    // RLS helpers' own coalesce(..., false) on the DB side.
    const [allowMemberInvites, setAllowMemberInvites] = useState(false);
    const [allowMemberRemove, setAllowMemberRemove] = useState(false);
    const [allowMemberEditSettings, setAllowMemberEditSettings] = useState(false);
    const [labelLayout, setLabelLayout] = useState(DEFAULT_LABEL_LAYOUT);
    const [isLabelPreviewOpen, setIsLabelPreviewOpen] = useState(false);

    useEffect(() => {
        if (!workspace) return;
        setName(workspace?.name);
        setColor(resolveWorkspaceColor(workspace));
    }, [workspace]);

    useEffect(() => {
        if (!mapDefault) return;
        setCenter({ lat: mapDefault.center[1], lng: mapDefault.center[0] });
    }, [mapDefault]);

    useEffect(() => {
        setAllowMemberInvites(collaborationSettings?.allowMemberInvites ?? false);
        setAllowMemberRemove(collaborationSettings?.allowMemberRemove ?? false);
        setAllowMemberEditSettings(collaborationSettings?.allowMemberEditSettings ?? false);
    }, [collaborationSettings]);

    useEffect(() => {
        if (isDeckDefaultPending) return;
        setDeckDefault(deckDefaultLocationId ?? null);
    }, [isDeckDefaultPending, deckDefaultLocationId]);

    useEffect(() => {
        if (isLabelLayoutPending) return;
        setLabelLayout({ ...DEFAULT_LABEL_LAYOUT, ...(labelLayoutSettings ?? {}) });
    }, [isLabelLayoutPending, labelLayoutSettings]);

    const { mutate: saveWorkspace, isPending: isSavingWorkspace } = useMutation(
        updateWorkspaceMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['workspace', id], updated);
                queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                // The one mutation every submit always fires (map default and
                // collaboration settings are conditional) — a single toast
                // here instead of one per mutation avoids stacking up to 3.
                toast.success('Ajustes guardados');
            },
        }),
    );

    const { mutate: saveMapDefault, isPending: isSavingMap } = useMutation(
        setWorkspaceSettingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({
                    queryKey: ['workspace-setting', id, 'mapDefaultViewport'],
                }),
        }),
    );

    const { mutate: saveCollaborationSettings, isPending: isSavingCollab } = useMutation(
        setWorkspaceSettingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({
                    queryKey: ['workspace-setting', id, 'collaborationSettings'],
                }),
        }),
    );

    const { mutate: saveDeckDefault, isPending: isSavingDeckDefault } = useMutation(
        setWorkspaceSettingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({
                    queryKey: ['workspace-setting', id, 'deckDefaultLocationId'],
                }),
        }),
    );

    const { mutate: saveLabelLayout, isPending: isSavingLabelLayout } = useMutation(
        setWorkspaceSettingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({
                    queryKey: ['workspace-setting', id, 'labelLayoutSettings'],
                }),
        }),
    );

    const { mutate: leaveWorkspace, isPending: isLeaving } = useMutation(
        removeWorkspaceMemberMutation({
            onSuccess: () => {
                // Otherwise Home's redirect-to-single-workspace effect reads
                // the stale cached list (still containing the one just
                // left) and bounces straight back into it.
                queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                router.replace('/');
            },
        }),
    );

    const { mutate: deleteWorkspace, isPending: isDeletingWorkspace } = useMutation(
        deleteWorkspaceMutation({
            onSuccess: () => router.replace('/'),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        saveWorkspace({ id, name: name.trim(), color });
        if (center) {
            saveMapDefault({
                workspaceId: id,
                key: 'mapDefaultViewport',
                value: { center: [center.lng, center.lat], zoom: DEFAULT_ZOOM },
            });
        }
        // RLS only lets the owner write this key — skip the call entirely
        // for a regular member instead of sending a request RLS would reject.
        if (isOwner) {
            saveCollaborationSettings({
                workspaceId: id,
                key: 'collaborationSettings',
                value: { allowMemberInvites, allowMemberRemove, allowMemberEditSettings },
            });
        }
        // Unconditional, unlike saveMapDefault above — null is a real,
        // meaningful value here ("sin ubicación por defecto, todos los
        // items"), not just "hasn't been touched yet".
        saveDeckDefault({ workspaceId: id, key: 'deckDefaultLocationId', value: deckDefault });
        saveLabelLayout({ workspaceId: id, key: 'labelLayoutSettings', value: labelLayout });
    };

    const handleLeave = async () => {
        const ok = await confirm({
            title: '¿Salir de este espacio?',
            confirmLabel: 'Salir',
            variant: 'destructive',
            confirmText: 'eliminar',
        });
        if (!ok) return;
        leaveWorkspace({ workspaceId: id, userId: user.id });
    };

    const handleDeleteWorkspace = async () => {
        const ok = await confirm({
            title: `¿Eliminar "${workspace?.name}"?`,
            description: 'Se borra todo lo que contiene — ubicaciones, artículos, tags, todo. Esto no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: workspace?.name,
        });
        if (!ok) return;
        deleteWorkspace(id);
    };

    // Waits for `center` to actually reflect the DB-saved default (not just
    // for the query itself to settle) before mounting LocationMapPicker —
    // its map viewport is uncontrolled after mount, so mounting it a render
    // early would permanently lock the camera onto the local per-device
    // default instead of the workspace's saved one.
    const isMapDefaultReady = !isMapDefaultPending && (mapDefault == null || center != null);

    if (
        isAuthLoading ||
        !user ||
        isWorkspacePending ||
        !workspace ||
        !isMapDefaultReady ||
        isCollabPending ||
        isDeckDefaultPending ||
        isLabelLayoutPending
    ) {
        return <Loading />;
    }

    const isOwner = workspace.owner_id === user.id;
    // The owner always can; a regular member only when collaborationSettings.
    // allowMemberEditSettings is on. Collaboración and the danger zone below
    // stay owner-only regardless — this only ever gates General/Mapa/Baraja.
    const canEditGeneralSettings = isOwner || !!collaborationSettings?.allowMemberEditSettings;
    const isPending =
        isSavingWorkspace ||
        isSavingMap ||
        isSavingCollab ||
        isSavingDeckDefault ||
        isSavingLabelLayout;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-12'
            data-block='WorkspaceSettingsPage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-5 ring-1 ring-foreground/10'
                data-block='WorkspaceSettingsHero'
            >
                <div className='flex items-start gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                        <GearSixIcon />
                    </span>
                    <div className='min-w-0'>
                        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Ajustes
                        </p>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            {workspace?.name}
                        </h1>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <SectionCard label='General'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='workspace-settings-name'>Nombre</FieldLabel>
                            <div className='flex items-center gap-2'>
                                <ColorPicker value={color} onChange={setColor}>
                                    <button
                                        type='button'
                                        aria-label='Elegir color'
                                        disabled={!canEditGeneralSettings}
                                        className='size-9 shrink-0 rounded-md border border-input bg-(--workspace-color) disabled:opacity-60'
                                        style={{ '--workspace-color': color }}
                                    />
                                </ColorPicker>
                                <Input
                                    id='workspace-settings-name'
                                    value={name}
                                    disabled={!canEditGeneralSettings}
                                    onChange={event => setName(event.target.value)}
                                />
                            </div>
                        </Field>
                    </FieldGroup>
                </SectionCard>

                <SectionCard label='Mapa'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Centrar mapa</FieldLabel>
                            <FieldDescription>
                                Vista inicial al abrir el selector de ubicación en este espacio.
                            </FieldDescription>
                            {/* LocationMapPicker has no disabled prop of its own —
                            pointer-events-none blocks the map/search interaction,
                            same visual muting as the disabled inputs above. */}
                            <div
                                className={cn({
                                    'pointer-events-none opacity-60': !canEditGeneralSettings,
                                })}
                            >
                                <LocationMapPicker value={center} onChange={setCenter} />
                            </div>
                        </Field>
                    </FieldGroup>
                </SectionCard>

                <SectionCard label='Cards'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel>Ubicación por defecto</FieldLabel>
                            <FieldDescription>
                                Con qué ubicación se abre la baraja (Cards) para todos. Sin
                                elegir ninguna, se muestran todos los items. Cualquiera puede
                                cambiar el filtro ahí mismo, pero solo de forma local — no se
                                guarda.
                            </FieldDescription>
                            <div
                                className={cn({
                                    'pointer-events-none opacity-60': !canEditGeneralSettings,
                                })}
                            >
                                <DeckLocationFilter
                                    workspaceId={id}
                                    value={deckDefault}
                                    onChange={setDeckDefault}
                                />
                            </div>
                        </Field>
                    </FieldGroup>
                </SectionCard>

                <SectionCard label='Etiquetas'>
                    <FieldGroup>
                        <Field orientation='horizontal'>
                            <FieldLabel>Hoja de impresión</FieldLabel>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                disabled={!canEditGeneralSettings}
                                onClick={() => setLabelLayout(DEFAULT_LABEL_LAYOUT)}
                                className='shrink-0'
                            >
                                <ArrowCounterClockwiseIcon data-icon='inline-start' />
                                Restaurar
                            </Button>
                        </Field>
                        <FieldDescription>
                            Tamaño de hoja, de cada etiqueta y sus márgenes — el margen inferior
                            siempre iguala al superior, y el derecho al izquierdo. Los espacios
                            entre etiquetas se calculan solos. Todas las medidas están en
                            milímetros.
                        </FieldDescription>
                        <div
                            className={cn('grid grid-cols-2 gap-3', {
                                'pointer-events-none opacity-60': !canEditGeneralSettings,
                            })}
                        >
                            <Field className='col-span-2'>
                                <FieldLabel>Tamaño de hoja</FieldLabel>
                                <SelectSearch
                                    triggerClassName='w-40'
                                    options={Object.keys(PAGE_SIZES)}
                                    value={labelLayout.pageSize}
                                    onChange={pageSize =>
                                        setLabelLayout(current => ({ ...current, pageSize }))
                                    }
                                    getKey={key => key}
                                    getLabel={key => PAGE_SIZES[key].label}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='label-box-width'>Ancho caja</FieldLabel>
                                <NumberScrubber
                                    id='label-box-width'
                                    min={10}
                                    max={300}
                                    step={0.1}
                                    value={labelLayout.boxWidthMm}
                                    onChange={next =>
                                        setLabelLayout(current => ({
                                            ...current,
                                            boxWidthMm: next,
                                        }))
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='label-box-height'>Alto caja</FieldLabel>
                                <NumberScrubber
                                    id='label-box-height'
                                    min={10}
                                    max={300}
                                    step={0.1}
                                    value={labelLayout.boxHeightMm}
                                    onChange={next =>
                                        setLabelLayout(current => ({
                                            ...current,
                                            boxHeightMm: next,
                                        }))
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='label-margin-vertical'>
                                    Margen vertical
                                </FieldLabel>
                                <NumberScrubber
                                    id='label-margin-vertical'
                                    min={0}
                                    max={50}
                                    step={0.1}
                                    value={labelLayout.marginVerticalMm}
                                    onChange={next =>
                                        setLabelLayout(current => ({
                                            ...current,
                                            marginVerticalMm: next,
                                        }))
                                    }
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='label-margin-horizontal'>
                                    Margen horizontal
                                </FieldLabel>
                                <NumberScrubber
                                    id='label-margin-horizontal'
                                    min={0}
                                    max={50}
                                    step={0.1}
                                    value={labelLayout.marginHorizontalMm}
                                    onChange={next =>
                                        setLabelLayout(current => ({
                                            ...current,
                                            marginHorizontalMm: next,
                                        }))
                                    }
                                />
                            </Field>
                            <Field className='col-span-2'>
                                <StepperInput
                                    min={1}
                                    max={60}
                                    step={1}
                                    mask='Mostrar {{value}} etiquetas por página'
                                    value={labelLayout.tagsPerPage}
                                    onChange={next =>
                                        setLabelLayout(current => ({
                                            ...current,
                                            tagsPerPage: next,
                                        }))
                                    }
                                />
                            </Field>
                        </div>

                        <div className='flex flex-col items-center gap-3 rounded-lg bg-muted/30 p-3'>
                            <LabelLayoutPreview {...labelLayout} />
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => setIsLabelPreviewOpen(true)}
                            >
                                Vista previa con datos de ejemplo
                            </Button>
                        </div>
                    </FieldGroup>
                </SectionCard>

                {!isOwner && !canEditGeneralSettings && (
                    <p className='text-xs text-muted-foreground'>
                        El dueño del espacio no te ha dado permiso para modificar estos ajustes.
                    </p>
                )}

                {isOwner && (
                    <SectionCard label='Colaboración'>
                        <FieldGroup>
                            <Field orientation='horizontal'>
                                <FieldContent>
                                    <FieldLabel htmlFor='workspace-settings-allow-invites'>
                                        Colaboradores pueden invitar
                                    </FieldLabel>
                                    <FieldDescription>
                                        Cualquier colaborador podrá generar enlaces de invitación,
                                        no solo tú. Solo tú puedes eliminarlos.
                                    </FieldDescription>
                                </FieldContent>
                                <Switch
                                    id='workspace-settings-allow-invites'
                                    checked={allowMemberInvites}
                                    onCheckedChange={setAllowMemberInvites}
                                />
                            </Field>
                            <Field orientation='horizontal'>
                                <FieldContent>
                                    <FieldLabel htmlFor='workspace-settings-allow-remove'>
                                        Colaboradores pueden eliminar colaboradores
                                    </FieldLabel>
                                    <FieldDescription>
                                        Cualquier colaborador podrá quitar a otros del espacio. A
                                        ti nunca te pueden quitar.
                                    </FieldDescription>
                                </FieldContent>
                                <Switch
                                    id='workspace-settings-allow-remove'
                                    checked={allowMemberRemove}
                                    onCheckedChange={setAllowMemberRemove}
                                />
                            </Field>
                            <Field orientation='horizontal'>
                                <FieldContent>
                                    <FieldLabel htmlFor='workspace-settings-allow-edit'>
                                        Colaboradores pueden modificar ajustes
                                    </FieldLabel>
                                    <FieldDescription>
                                        Podrán editar General y Mapa. Esta sección de Colaboración
                                        y eliminar el espacio siguen siendo solo tuyas.
                                    </FieldDescription>
                                </FieldContent>
                                <Switch
                                    id='workspace-settings-allow-edit'
                                    checked={allowMemberEditSettings}
                                    onCheckedChange={setAllowMemberEditSettings}
                                />
                            </Field>
                        </FieldGroup>
                    </SectionCard>
                )}

                <Button
                    type='submit'
                    disabled={isPending || !name.trim() || !canEditGeneralSettings}
                >
                    {isPending && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </form>

            <LabelLayoutPreviewDialog
                open={isLabelPreviewOpen}
                onOpenChange={setIsLabelPreviewOpen}
                layout={labelLayout}
            />

            {!isOwner && (
                <div
                    className='flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4'
                    data-block='LeaveWorkspaceCard'
                >
                    <div>
                        <h2 className='text-xs font-medium tracking-wide text-destructive uppercase'>
                            Zona de riesgo
                        </h2>
                        <p className='mt-1 text-sm text-muted-foreground'>
                            Al salir, pierdes acceso a este espacio y todo lo que contiene.
                        </p>
                    </div>
                    <Button
                        type='button'
                        variant='destructive'
                        disabled={isLeaving}
                        onClick={handleLeave}
                    >
                        {isLeaving ? (
                            <Spinner data-icon='inline-start' />
                        ) : (
                            <SignOutIcon data-icon='inline-start' />
                        )}
                        Abandonar espacio
                    </Button>
                </div>
            )}

            {isOwner && (
                <div
                    className='flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4'
                    data-block='DeleteWorkspaceCard'
                >
                    <div>
                        <h2 className='text-xs font-medium tracking-wide text-destructive uppercase'>
                            Zona de riesgo
                        </h2>
                        <p className='mt-1 text-sm text-muted-foreground'>
                            Se borra todo lo que contiene — ubicaciones, items, tags, todo.
                            Esto no se puede deshacer. Como dueño, no puedes salir de este espacio;
                            solo eliminarlo.
                        </p>
                    </div>
                    <Button
                        type='button'
                        variant='destructive'
                        disabled={isDeletingWorkspace}
                        onClick={handleDeleteWorkspace}
                    >
                        {isDeletingWorkspace ? (
                            <Spinner data-icon='inline-start' />
                        ) : (
                            <TrashIcon data-icon='inline-start' />
                        )}
                        Eliminar espacio
                    </Button>
                </div>
            )}
        </div>
    );
}
