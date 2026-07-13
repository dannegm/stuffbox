'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery } from '@/queries/workspaces';
import { locationQuery, locationChildrenQuery, locationAncestorsQuery } from '@/queries/locations';
import { itemsAtLocationQuery } from '@/queries/items';
import { LocationListItem } from '@/components/locations/location-list-item';
import { LocationBreadcrumb } from '@/components/locations/location-breadcrumb';
import { CreateLocationDialog } from '@/components/locations/create-location-dialog';
import { ItemListRow } from '@/components/items/item-list-row';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { Separator } from '@/ui/separator';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='LocationLoading'>
        <Spinner className='size-6' />
    </div>
);

export default function LocationPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: location, isPending: isLocationPending } = useQuery(
        locationQuery(id, { enabled: !!user }),
    );
    const { data: workspace } = useQuery(
        workspaceQuery(location?.workspace_id, { enabled: !!location }),
    );
    const { data: ancestors } = useQuery(locationAncestorsQuery(location?.parent_id));
    const { data: children, isPending: isChildrenPending } = useQuery(
        locationChildrenQuery(
            { workspaceId: location?.workspace_id, parentId: id },
            { enabled: !!location },
        ),
    );
    const { data: items, isPending: isItemsPending } = useQuery(
        itemsAtLocationQuery(id, { enabled: !!location }),
    );

    if (
        isAuthLoading ||
        !user ||
        isLocationPending ||
        !location ||
        !workspace ||
        isChildrenPending ||
        isItemsPending
    ) {
        return <Loading />;
    }

    const isEmpty = children.length === 0 && items.length === 0;

    return (
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='LocationPage'>
            <LocationBreadcrumb
                workspace={workspace}
                ancestors={ancestors ?? []}
                current={location}
            />

            <div className='flex items-center justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                        <DynamicIcon icon={getLocationIcon(location)} />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-lg leading-tight font-medium'>
                            {location.name}
                        </h1>
                        <p className='truncate text-xs text-muted-foreground capitalize'>
                            {location.type}
                        </p>
                    </div>
                </div>
                <CreateLocationDialog
                    workspaceId={location.workspace_id}
                    parentId={id}
                    title='Agregar dentro'
                >
                    <Button size='sm' variant='outline'>
                        <HugeiconsIcon icon={Add01Icon} data-icon='inline-start' />
                        Agregar
                    </Button>
                </CreateLocationDialog>
            </div>

            {isEmpty ? (
                <Empty className='flex-1' data-block='LocationEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon'>
                            <DynamicIcon icon={getLocationIcon(location)} />
                        </EmptyMedia>
                        <EmptyTitle>Vacío por ahora</EmptyTitle>
                        <EmptyDescription>Agrega algo dentro para empezar.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-4'>
                    {children.length > 0 && (
                        <div className='flex flex-col gap-2'>
                            {children.map(child => (
                                <LocationListItem key={child.id} location={child} />
                            ))}
                        </div>
                    )}

                    {children.length > 0 && items.length > 0 && <Separator />}

                    {items.length > 0 && (
                        <div className='flex flex-col gap-2'>
                            {items.map(item => (
                                <ItemListRow key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
