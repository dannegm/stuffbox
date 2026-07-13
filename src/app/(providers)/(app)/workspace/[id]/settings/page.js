'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CaretLeftIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery, updateWorkspaceMutation } from '@/queries/workspaces';
import { workspaceSettingQuery, setWorkspaceSettingMutation } from '@/queries/workspace-settings';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { LocationMapPicker } from '@/components/locations/location-map-picker';
import { ColorPicker } from '@/ui/color-picker';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

// LocationMapPicker only hands back {lat,lng} (no zoom control) — fixed here
// rather than adding a zoom picker just for this one workspace-level default.
const DEFAULT_ZOOM = 14;

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='WorkspaceSettingsLoading'>
        <Spinner className='size-6' />
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
            <div className='flex items-center gap-2'>
                <Button
                    size='icon-sm'
                    variant='outline'
                    render={<Link href={`/workspace/${id}`} />}
                >
                    <CaretLeftIcon />
                </Button>
                <h1 className='truncate font-heading text-lg font-medium'>
                    Ajustes — {workspace.name}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
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
                    <Field>
                        <FieldLabel>Centrar mapa</FieldLabel>
                        <LocationMapPicker value={center} onChange={setCenter} />
                    </Field>
                </FieldGroup>

                <Button type='submit' disabled={isPending || !name.trim()} className='self-start'>
                    {isPending && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </form>
        </div>
    );
}
