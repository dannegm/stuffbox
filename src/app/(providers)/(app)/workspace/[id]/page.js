'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    PlusIcon,
    PencilSimpleIcon,
    HouseIcon,
    UsersIcon,
    TagIcon,
    TruckIcon,
    GearIcon,
    CardsThreeIcon,
    CaretRightIcon,
    PackageIcon,
    LeafIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspaceQuery } from '@/queries/workspaces';
import { workspaceMembersQuery } from '@/queries/collaborators';
import { locationChildrenQuery, locationCountsQuery } from '@/queries/locations';
import { movesQuery } from '@/queries/moves';
import { tagsQuery } from '@/queries/tags';
import { PackedTape } from '@/components/moves/packed-tape';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { Stat } from '@/ui/stat';
import { AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { UserAvatar } from '@/ui/user-avatar';
import { DEFAULT_LOCATION_ICONS } from '@/constants/location-icons';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { cn } from '@/helpers/utils';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='WorkspaceLoading'>
        <Skeleton className='h-28 w-full rounded-2xl' />
        <Skeleton className='h-24 w-full rounded-2xl' />
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <Skeleton className='h-24 rounded-2xl' />
            <Skeleton className='h-24 rounded-2xl' />
            <Skeleton className='h-24 rounded-2xl' />
        </div>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
            <Skeleton className='h-16 rounded-2xl' />
            <Skeleton className='h-16 rounded-2xl' />
            <Skeleton className='h-16 rounded-2xl' />
        </div>
    </div>
);

// Shortcut tile shared by the Mudanzas/Tags/Ajustes row below the Cards CTA —
// a compact stat-or-label card tuned for a tappable bento cell (the hero's
// own Stat primitive stays reserved for the header itself).
const QuickLinkTile = ({ href, icon: Icon, label, hint, value, accent = 'primary' }) => (
    <Link
        href={href}
        data-block='WorkspaceQuickLink'
        className='group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
    >
        <div className='flex min-w-0 items-center gap-3'>
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5',
                    accent === 'flourish'
                        ? 'bg-flourish/15 text-flourish'
                        : 'bg-primary/10 text-primary',
                )}
            >
                <Icon />
            </span>
            <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>{label}</p>
                <p className='truncate text-xs text-muted-foreground'>
                    {value !== undefined ? value : hint}
                </p>
            </div>
        </div>
        <CaretRightIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
    </Link>
);

// Houses on this page get an icon-forward row, not the photo-forward
// LocationCardItem used for boxes/items elsewhere — a house/warehouse root
// realistically never has its own photo, so a plain icon chip stands in for
// a cover, laid out as a row (icon, name/type, counts, chevron) rather than
// a photo-card grid.
const HouseTile = ({ house, counts }) => (
    <Link
        href={`/location/${house.id}`}
        data-block='HouseTile'
        className='group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
    >
        {house.active_move_id && <PackedTape />}
        <span
            className={cn(
                'z-1 flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 [&_svg]:size-5',
                house.type === 'warehouse'
                    ? 'bg-flourish/15 text-flourish ring-flourish/15'
                    : 'bg-primary/10 text-primary ring-primary/15',
            )}
        >
            <DynamicIcon icon={getLocationIcon(house)} />
        </span>
        <div className='z-1 min-w-0 flex-1'>
            <p className='truncate font-medium'>{house.name}</p>
            <p className='truncate text-xs text-muted-foreground capitalize'>{house.type}</p>
        </div>
        {(counts?.locations > 0 || counts?.items > 0) && (
            <div className='z-1 flex shrink-0 items-center gap-3 text-xs text-muted-foreground'>
                {counts.locations > 0 && (
                    <span className='flex items-center gap-1'>
                        <PackageIcon className='size-3.5' />
                        {counts.locations}
                    </span>
                )}
                {counts.items > 0 && (
                    <span className='flex items-center gap-1'>
                        <LeafIcon className='size-3.5' />
                        {counts.items}
                    </span>
                )}
            </div>
        )}
        <CaretRightIcon className='z-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
    </Link>
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
    const { data: moves } = useQuery(movesQuery(id, { enabled: !!user }));
    const { data: tags } = useQuery(tagsQuery(id, { enabled: !!user }));

    if (isAuthLoading || !user || isWorkspacePending || !workspace || isHousesPending) {
        return <Loading />;
    }

    const activeMoves = moves?.filter(move => move.status !== 'done').length ?? 0;

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
                            <span className='hidden sm:inline'>Agregar ubicación</span>
                        </Button>
                    </div>
                </div>

                <div className='mt-5 flex flex-wrap items-center gap-x-6 gap-y-3'>
                    <Stat icon={HouseIcon} value={houses.length} label='ubicaciones' />
                    {!!members?.length && (
                        <Link
                            href='/collaborators'
                            className='-m-1.5 flex items-center gap-6 rounded-lg p-1.5 transition-colors hover:bg-foreground/5'
                        >
                            <Stat icon={UsersIcon} value={members.length} label='colaboradores' />
                            <AvatarGroup>
                                {members.slice(0, 4).map(member => (
                                    <UserAvatar key={member.user_id} user={member.profiles} size='sm' />
                                ))}
                                {members.length > 4 && (
                                    <AvatarGroupCount>+{members.length - 4}</AvatarGroupCount>
                                )}
                            </AvatarGroup>
                        </Link>
                    )}
                </div>
            </div>

            <Link
                href='/deck'
                data-block='WorkspaceCardsCta'
                className='group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-flourish/20 p-5 ring-1 ring-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 sm:flex-row sm:items-center sm:justify-between'
            >
                <div className='flex items-center gap-4'>
                    <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-xs [&_svg]:size-6'>
                        <CardsThreeIcon weight='fill' />
                    </span>
                    <div className='min-w-0'>
                        <p className='font-heading text-lg font-semibold tracking-tight sm:text-xl'>
                            Califica tus cosas
                        </p>
                        <p className='mt-0.5 text-sm text-foreground/70'>
                            Desliza tus objetos y ubicaciones para encontrar lo que te encanta, lo
                            que sobra y lo que ya no sirve.
                        </p>
                    </div>
                </div>
                <span className='flex shrink-0 items-center gap-1.5 self-start rounded-full bg-background/90 px-3.5 py-2 text-sm font-medium shadow-xs transition-transform group-hover:translate-x-0.5 sm:self-auto'>
                    Empezar
                    <CaretRightIcon className='size-4' />
                </span>
            </Link>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3' data-block='WorkspaceQuickLinks'>
                <QuickLinkTile
                    href='/moves'
                    icon={TruckIcon}
                    accent='flourish'
                    label='Mudanzas'
                    value={activeMoves > 0 ? `${activeMoves} activas` : undefined}
                    hint='Planea un traslado'
                />
                <QuickLinkTile
                    href='/tags'
                    icon={TagIcon}
                    label='Tags'
                    value={tags?.length ? `${tags.length} creados` : undefined}
                    hint='Organiza por categoría'
                />
                <QuickLinkTile
                    href={`/workspace/${id}/settings`}
                    icon={GearIcon}
                    label='Ajustes'
                    hint='Nombre y preferencias'
                />
            </div>

            {houses.length === 0 ? (
                <Empty className='flex-1' data-block='HousesEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                            <DynamicIcon icon={DEFAULT_LOCATION_ICONS.house} />
                        </EmptyMedia>
                        <EmptyTitle>Sin ubicaciones todavía</EmptyTitle>
                        <EmptyDescription>
                            Agrega tu primera ubicación para empezar a organizar.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-3' data-block='HousesSection'>
                    <p className='text-sm font-semibold text-muted-foreground'>
                        Ubicaciones · {houses.length}
                    </p>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                        {houses.map(house => (
                            <HouseTile key={house.id} house={house} counts={houseCounts?.[house.id]} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
