'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    TrashIcon,
    ArrowsLeftRightIcon,
    PackageIcon,
    PrinterIcon,
    ArrowRightIcon,
    TruckIcon,
    AirplaneIcon,
} from '@phosphor-icons/react/ssr';
import { BoxesIcon } from 'lucide-react';
import {
    moveQuery,
    updateMoveMutation,
    deleteMoveMutation,
    packedInMoveQuery,
} from '@/queries/moves';
import { unpackItemMutation } from '@/queries/items';
import { unpackLocationMutation } from '@/queries/locations';
import { MoveRouteMap } from '@/components/moves/move-route-map';
import { LocationPicker } from '@/components/locations/location-picker';
import { SelectSearch } from '@/ui/select-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { getItemIcon } from '@/helpers/item';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { MOVE_STATUSES } from '@/constants/move-status';

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='MoveLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
        </div>
    </div>
);

export default function MovePage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [unpackTarget, setUnpackTarget] = useState(null);

    const { data: move, isPending: isMovePending } = useQuery(moveQuery(id));
    const { data: packed, isPending: isPackedPending } = useQuery(packedInMoveQuery(id));

    const invalidatePacked = () => queryClient.invalidateQueries({ queryKey: ['move-packed', id] });

    const { mutate: updateMove } = useMutation(
        updateMoveMutation({
            onSuccess: updated => queryClient.setQueryData(['move', id], updated),
        }),
    );

    const { mutate: destroyMove, isPending: isDeleting } = useMutation(
        deleteMoveMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['moves', move?.workspace_id] });
                router.replace('/moves');
            },
        }),
    );

    const { mutate: unpackItem } = useMutation(unpackItemMutation({ onSuccess: invalidatePacked }));
    const { mutate: unpackLocation } = useMutation(
        unpackLocationMutation({ onSuccess: invalidatePacked }),
    );

    const handleStatusChange = status =>
        updateMove({ id, name: move?.name, status, routeType: move?.route_type });

    const handleDelete = async () => {
        const ok = await confirm({
            title: `¿Eliminar la mudanza "${move?.name}"?`,
            description: 'Se desempaca todo lo suelto.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
        });
        if (!ok) return;
        destroyMove(id);
    };

    const handleUnpack = destinationId => {
        if (unpackTarget?.type === 'item') {
            unpackItem({ id: unpackTarget.id, locationId: destinationId });
        } else {
            unpackLocation({ id: unpackTarget?.id, parentId: destinationId });
        }
        setUnpackTarget(null);
    };

    if (isMovePending || !move || isPackedPending || !packed) {
        return <Loading />;
    }

    const hasRoute = move.origin?.lat != null && move.destination?.lat != null;
    const isEmpty = packed.items.length === 0 && packed.locations.length === 0;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='MovePage'
        >
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='MoveHero'
            >
                <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-flourish shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5'>
                            {move.route_type === 'air' ? <AirplaneIcon /> : <TruckIcon />}
                        </span>
                        <div className='min-w-0 flex-1'>
                            <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                                {move.name}
                            </h1>
                            <p className='flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
                                <span className='truncate'>{move.origin?.name}</span>
                                <ArrowRightIcon className='size-3 shrink-0' />
                                <span className='truncate'>{move.destination?.name}</span>
                            </p>
                        </div>
                    </div>

                    {!isEmpty && (
                        <div className='flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-2'>
                            <Stat
                                icon={BoxesIcon}
                                value={packed.locations.length + packed.items.length}
                                label='empacado'
                            />
                        </div>
                    )}
                </div>

                <div className='h-1 bg-muted/50' />

                <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
                    {!isEmpty && (
                        <Button
                            size='sm'
                            variant='outline'
                            render={<Link href={`/move/${id}/labels`} />}
                        >
                            <PrinterIcon data-icon='inline-start' />
                            Etiquetas
                        </Button>
                    )}
                    <SelectSearch
                        options={MOVE_STATUSES}
                        value={move.status}
                        onChange={handleStatusChange}
                        getKey={option => option.value}
                        getLabel={option => option.label}
                        triggerClassName='w-auto'
                    />

                    <div className='flex flex-1' />

                    <Button
                        size='icon-sm'
                        variant='outline'
                        disabled={isDeleting}
                        onClick={handleDelete}
                    >
                        {isDeleting ? <Spinner /> : <TrashIcon />}
                    </Button>
                </div>
            </div>

            {hasRoute ? (
                <MoveRouteMap
                    origin={move.origin}
                    destination={move.destination}
                    routeType={move.route_type}
                    status={move.status}
                />
            ) : (
                <p className='rounded-lg border p-3 text-sm text-muted-foreground'>
                    Ponle ubicación (lat/lng) a{' '}
                    {move.origin?.lat == null ? move.origin?.name : move.destination?.name} para ver
                    la ruta en el mapa.
                </p>
            )}

            <LocationPicker
                open={!!unpackTarget}
                onOpenChange={next => !next && setUnpackTarget(null)}
                workspaceId={move.workspace_id}
                onSelect={handleUnpack}
            />

            {isEmpty ? (
                <Empty className='flex-1 -mt-16' data-block='MovePackedEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-flourish/15 text-flourish'>
                            <PackageIcon />
                        </EmptyMedia>
                        <EmptyTitle>Nada empacado todavía</EmptyTitle>
                        <EmptyDescription>
                            Abre un item o una caja y usa "Empacar" para agregarlo aquí.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-2'>
                    {packed.locations.map(location => (
                        <div
                            key={location.id}
                            className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40'
                        >
                            <Link
                                href={`/location/${location.id}`}
                                className='flex min-w-0 flex-1 items-center gap-3 hover:underline'
                            >
                                <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                    <DynamicIcon icon={getLocationIcon(location)} />
                                </span>
                                <span className='min-w-0 flex-1 truncate font-medium'>
                                    {location.name}
                                </span>
                            </Link>
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                    setUnpackTarget({ type: 'location', id: location.id })
                                }
                            >
                                <ArrowsLeftRightIcon data-icon='inline-start' />
                                Desempacar
                            </Button>
                        </div>
                    ))}
                    {packed.items.map(item => (
                        <div
                            key={item.id}
                            className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40'
                        >
                            <Link
                                href={`/item/${item.id}`}
                                className='flex min-w-0 flex-1 items-center gap-3 hover:underline'
                            >
                                <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                    <DynamicIcon icon={getItemIcon(item)} />
                                </span>
                                <span className='min-w-0 flex-1 truncate font-medium'>
                                    {item.name}
                                </span>
                            </Link>
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() => setUnpackTarget({ type: 'item', id: item.id })}
                            >
                                <ArrowsLeftRightIcon data-icon='inline-start' />
                                Desempacar
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
