'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery } from '@/queries/workspaces';
import { locationChildrenQuery } from '@/queries/locations';
import { LocationListItem } from '@/components/locations/location-list-item';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { DynamicIcon } from '@/ui/dynamic-icon';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='WorkspaceLoading'>
        <Spinner className='size-6' />
    </div>
);

export default function WorkspacePage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspace, isPending: isWorkspacePending } = useQuery(
        workspaceQuery(id, { enabled: !!user }),
    );
    const { data: houses, isPending: isHousesPending } = useQuery(
        locationChildrenQuery({ workspaceId: id, parentId: null }, { enabled: !!user }),
    );

    if (isAuthLoading || !user || isWorkspacePending || isHousesPending) return <Loading />;

    return (
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspacePage'>
            <div className='flex items-center justify-between gap-2'>
                <h1 className='truncate font-heading text-lg font-medium'>{workspace.name}</h1>
                <Button
                    size='sm'
                    variant='outline'
                    render={<Link href={`/house/new?workspace=${id}`} />}
                >
                    <HugeiconsIcon icon={Add01Icon} data-icon='inline-start' />
                    Agregar casa
                </Button>
            </div>

            {houses.length === 0 ? (
                <Empty className='flex-1' data-block='HousesEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon'>
                            <DynamicIcon icon={DEFAULT_LOCATION_ICONS.house} />
                        </EmptyMedia>
                        <EmptyTitle>Sin casas todavía</EmptyTitle>
                        <EmptyDescription>
                            Agrega tu primera casa para empezar a organizar.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-2'>
                    {houses.map(house => (
                        <LocationListItem key={house.id} location={house} />
                    ))}
                </div>
            )}
        </div>
    );
}
