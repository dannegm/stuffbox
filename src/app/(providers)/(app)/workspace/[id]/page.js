'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, PencilSimpleIcon, HouseIcon, UsersIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery } from '@/queries/workspaces';
import { workspaceMembersQuery } from '@/queries/collaborators';
import { locationChildrenQuery, locationCountsQuery } from '@/queries/locations';
import { LocationListItem } from '@/components/locations/location-list-item';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { Stat } from '@/ui/stat';
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getAvatarUrl } from '@/helpers/avatar';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspaceLoading'>
        <Skeleton className='h-28 w-full rounded-2xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
        </div>
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
    const { data: members } = useQuery(workspaceMembersQuery(id, { enabled: !!user }));
    const { data: houseCounts } = useQuery(
        locationCountsQuery(houses?.map(house => house.id) ?? [], {
            enabled: !!houses?.length,
        }),
    );

    if (isAuthLoading || !user || isWorkspacePending || isHousesPending) return <Loading />;

    return (
        <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspacePage'>
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-5 ring-1 ring-foreground/10'
                data-block='WorkspaceHero'
            >
                <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Espacio
                        </p>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            {workspace.name}
                        </h1>
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                        <Button
                            size='icon-sm'
                            variant='outline'
                            render={<Link href={`/workspace/${id}/settings`} />}
                        >
                            <PencilSimpleIcon />
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            render={<Link href={`/house/new?workspace=${id}`} />}
                        >
                            <PlusIcon data-icon='inline-start' />
                            <span className='hidden sm:inline'>Agregar casa</span>
                        </Button>
                    </div>
                </div>

                <div className='mt-5 flex flex-wrap items-center gap-x-6 gap-y-3'>
                    <Stat icon={HouseIcon} value={houses.length} label='casas' />
                    {!!members?.length && (
                        <>
                            <Stat icon={UsersIcon} value={members.length} label='colaboradores' />
                            <AvatarGroup className='ml-auto'>
                                {members.slice(0, 4).map(member => (
                                    <Avatar key={member.user_id} size='sm'>
                                        <AvatarImage
                                            src={getAvatarUrl(
                                                member.profiles?.avatar_seed,
                                                member.profiles?.gender,
                                            )}
                                            alt={member.profiles?.name ?? ''}
                                        />
                                        <AvatarFallback>
                                            {member.profiles?.name?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {members.length > 4 && (
                                    <AvatarGroupCount>+{members.length - 4}</AvatarGroupCount>
                                )}
                            </AvatarGroup>
                        </>
                    )}
                </div>
            </div>

            {houses.length === 0 ? (
                <Empty className='flex-1' data-block='HousesEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
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
                        <LocationListItem
                            key={house.id}
                            location={house}
                            counts={houseCounts?.[house.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
