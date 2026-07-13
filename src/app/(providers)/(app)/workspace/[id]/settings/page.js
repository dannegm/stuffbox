'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CaretLeftIcon, GearSixIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery, updateWorkspaceMutation } from '@/queries/workspaces';
import { workspaceSettingQuery, setWorkspaceSettingMutation } from '@/queries/workspace-settings';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { ColorPicker } from '@/ui/color-picker';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/ui/field';
import { Input } from '@/ui/input';
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

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspace, isPending: isWorkspacePending } = useQuery(
        workspaceQuery(id, { enabled: !!user }),
    );
    const { data: mapDefault, isPending: isMapDefaultPending } = useQuery(
        workspaceSettingQuery(id, 'mapDefaultViewport', { enabled: !!user }),
    );

    const [name, setName] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [center, setCenter] = useState(null);

    useEffect(() => {
        if (!workspace) return;
        setName(workspace.name);
        setColor(resolveWorkspaceColor(workspace));
    }, [workspace]);

    useEffect(() => {
        if (!mapDefault) return;
        setCenter({ lat: mapDefault.center[1], lng: mapDefault.center[0] });
    }, [mapDefault]);

    const { mutate: saveWorkspace, isPending: isSavingWorkspace } = useMutation(
        updateWorkspaceMutation({
            onSuccess: updated => {
                queryClient.setQueryData(['workspace', id], updated);
                queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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
    };

    // Waits for `center` to actually reflect the DB-saved default (not just
    // for the query itself to settle) before mounting LocationMapPicker —
    // its map viewport is uncontrolled after mount, so mounting it a render
    // early would permanently lock the camera onto the local per-device
    // default instead of the workspace's saved one.
    const isMapDefaultReady = !isMapDefaultPending && (mapDefault == null || center != null);

    if (isAuthLoading || !user || isWorkspacePending || !workspace || !isMapDefaultReady) {
        return <Loading />;
    }

    const isPending = isSavingWorkspace || isSavingMap;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='WorkspaceSettingsPage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-5 ring-1 ring-foreground/10'
                data-block='WorkspaceSettingsHero'
            >
                <span
                    aria-hidden
                    className='absolute inset-x-0 top-0 h-1 bg-(--ws-color)'
                    style={{ '--ws-color': color }}
                />
                <div className='flex items-center gap-3'>
                    <Button
                        size='icon-sm'
                        variant='outline'
                        className='shrink-0'
                        render={<Link href={`/workspace/${id}`} />}
                    >
                        <CaretLeftIcon />
                    </Button>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-4'>
                        <GearSixIcon />
                    </span>
                    <div className='min-w-0'>
                        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Ajustes
                        </p>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            {workspace.name}
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

                <Button type='submit' disabled={isPending || !name.trim()} className='self-start'>
                    {isPending && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </form>
        </div>
    );
}
