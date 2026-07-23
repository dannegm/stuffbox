'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CaretLeftIcon, GearSixIcon, SignOutIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import {
    workspaceQuery,
    updateWorkspaceMutation,
    deleteWorkspaceMutation,
} from '@/queries/workspaces';
import { workspaceSettingQuery, setWorkspaceSettingMutation } from '@/queries/workspace-settings';
import { removeWorkspaceMemberMutation } from '@/queries/collaborators';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { ColorPicker } from '@/ui/color-picker';
import { Field, FieldGroup, FieldContent, FieldLabel, FieldDescription } from '@/ui/field';
import { Input } from '@/ui/input';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';

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
    const { data: mapDefault, isPending: isMapDefaultPending } = useQuery(
        workspaceSettingQuery(id, 'mapDefaultViewport', { enabled: !!user }),
    );
    const { data: collaborationSettings, isPending: isCollabPending } = useQuery(
        workspaceSettingQuery(id, 'collaborationSettings', { enabled: !!user }),
    );

    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [center, setCenter] = useState(null);
    // Both default false — a workspace with no 'collaborationSettings' row
    // yet (the common case, nothing seeds it) resolves to null, same as the
    // RLS helpers' own coalesce(..., false) on the DB side.
    const [allowMemberInvites, setAllowMemberInvites] = useState(false);
    const [allowMemberRemove, setAllowMemberRemove] = useState(false);

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
    }, [collaborationSettings]);

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

    const { mutate: leaveWorkspace, isPending: isLeaving } = useMutation(
        removeWorkspaceMemberMutation({
            onSuccess: () => router.replace('/'),
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
                value: { allowMemberInvites, allowMemberRemove },
            });
        }
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
            description: 'Se borra todo lo que contiene — casas, locations, items, tags, todo. Esto no se puede deshacer.',
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
        isCollabPending
    ) {
        return <Loading />;
    }

    const isOwner = workspace.owner_id === user.id;
    const isPending = isSavingWorkspace || isSavingMap || isSavingCollab;

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
                                        className='size-9 shrink-0 rounded-md border border-input bg-(--workspace-color)'
                                        style={{ '--workspace-color': color }}
                                    />
                                </ColorPicker>
                                <Input
                                    id='workspace-settings-name'
                                    value={name}
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
                            <LocationMapPicker value={center} onChange={setCenter} />
                        </Field>
                    </FieldGroup>
                </SectionCard>

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
                        </FieldGroup>
                    </SectionCard>
                )}

                <Button type='submit' disabled={isPending || !name.trim()}>
                    {isPending && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </form>

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
                            Se borra todo lo que contiene — casas, locations, items, tags, todo.
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
