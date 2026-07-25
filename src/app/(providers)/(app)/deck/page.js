'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ClockCounterClockwiseIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    ShuffleIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useSettings } from '@/hooks/use-settings';
import { workspacesQuery } from '@/queries/workspaces';
import { deckQueueQuery, entityRatingsQuery, rateEntityMutation } from '@/queries/entity-ratings';
import { locationDescendantIdsQuery } from '@/queries/locations';
import { getEntityRatingKey, groupRatingsByEntity } from '@/helpers/entity-ratings';
import { buildDeckQueue } from '@/helpers/deck';
import { getItemIcon, getFirstItemPhoto, getItemPhotoUrl } from '@/helpers/item';
import { getLocationIcon, getFirstLocationPhoto, getLocationPhotoUrl } from '@/helpers/location';
import { Deck, DeckCards, DeckEmpty } from '@/ui/deck';
import { DeckEntityCard } from '@/components/deck/deck-entity-card';
import { DeckLocationFilter } from '@/components/deck/deck-location-filter';
import { RatedEntitiesDialog } from '@/components/deck/rated-entities-dialog';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

const Loading = () => (
    <div className='flex flex-1 flex-col gap-4 p-4' data-block='DeckLoading'>
        <Skeleton className='h-4 w-32 rounded' />
        <div className='mx-auto flex w-full max-w-sm flex-1 items-center justify-center'>
            <Skeleton className='aspect-2/3 w-full rounded-2xl' />
        </div>
    </div>
);

export default function DeckPage() {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [debug] = useSettings('debug', false);

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    // /deck has no /workspace/[id] prefix to read from — same fallback the
    // sidebar uses for workspace-independent routes, always the first
    // workspace regardless of whatever's active in the switcher.
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(item => item.id === activeWorkspaceId) ?? workspaces?.[0];

    const { data: entities, isPending: isEntitiesPending } = useQuery(
        deckQueueQuery(workspace?.id),
    );
    const { data: ratings, isPending: isRatingsPending } = useQuery(
        entityRatingsQuery(workspace?.id),
    );

    const [queue, setQueue] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [indexChangeDirection, setIndexChangeDirection] = useState('left');
    const [ratedDialogOpen, setRatedDialogOpen] = useState(false);
    // null = "todas las ubicaciones" (no filtering), the default.
    const [filterLocationId, setFilterLocationId] = useState(null);

    const { data: descendantIds, isPending: isDescendantIdsPending } = useQuery(
        locationDescendantIdsQuery(filterLocationId),
    );
    // Includes the selected location itself, not just its descendants — an
    // item sitting directly in it (not in a nested room/box) should still
    // match. getLocationDescendantIds only ever returns strict descendants.
    const allowedLocationIds = filterLocationId
        ? [filterLocationId, ...(descendantIds ?? [])]
        : null;

    const filteredEntities = useMemo(
        () =>
            allowedLocationIds
                ? entities?.filter(entity => allowedLocationIds.includes(entity.containerId))
                : entities,
        [entities, allowedLocationIds],
    );

    const ratedKeys = useMemo(() => {
        if (!ratings || !user) return new Set();
        return new Set(
            ratings
                .filter(rating => rating.profile_id === user.id)
                .map(rating => getEntityRatingKey(rating.entity_type, rating.entity_id)),
        );
    }, [ratings, user]);

    // Builds the queue exactly once, when data first arrives — recomputing it
    // on every refetch (e.g. after each vote invalidates entity-ratings)
    // would reshuffle the deck out from under the card being looked at.
    // Also waits out the descendant-ids fetch when a location filter is
    // active, so the queue isn't built once against a partial (location-only,
    // no-descendants-yet) allow-list and then never rebuilt.
    useEffect(() => {
        if (queue || !filteredEntities || !ratings || !user) return;
        if (filterLocationId && isDescendantIdsPending) return;
        setQueue(buildDeckQueue(filteredEntities, ratedKeys));
    }, [
        filteredEntities,
        ratings,
        user,
        queue,
        ratedKeys,
        filterLocationId,
        isDescendantIdsPending,
    ]);

    const handleFilterChange = nextLocationId => {
        setFilterLocationId(nextLocationId);
        setQueue(null);
        setCurrentIndex(0);
    };

    const { mutate: rate } = useMutation(
        rateEntityMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspace?.id] }),
        }),
    );

    const rateEntity = (entity, liked) => {
        // Debug mode is for poking at the swipe/animation behavior without
        // polluting entity_ratings with throwaway votes — the card still
        // advances, nothing gets written.
        if (debug) return;
        rate({
            workspaceId: workspace.id,
            entityType: entity.entityType,
            entityId: entity.entityId,
            profileId: user.id,
            liked,
        });
    };

    const handleSwipe = (index, direction) => {
        const entity = queue?.[index];
        if (entity) rateEntity(entity, direction === 'right');
    };

    const handleButtonRate = liked => {
        const entity = queue?.[currentIndex];
        if (!entity) return;
        rateEntity(entity, liked);
        setIndexChangeDirection(liked ? 'right' : 'left');
        setCurrentIndex(index => index + 1);
    };

    // No rating written — just moves past a card the user isn't sure about
    // yet, without it counting as "already rated" (buildDeckQueue only
    // excludes ratedKeys, so a skipped entity resurfaces on the next
    // reshuffle instead of being lost).
    const handleSkip = () => {
        const entity = queue?.[currentIndex];
        if (!entity) return;
        setIndexChangeDirection('left');
        setCurrentIndex(index => index + 1);
    };

    const handleReshuffle = () => {
        if (!filteredEntities) return;
        setQueue(buildDeckQueue(filteredEntities, ratedKeys));
        setCurrentIndex(0);
    };

    // After the danger-zone "clear all" action, ratedKeys is still stale
    // (the entity-ratings invalidation it triggers refetches in the
    // background) — resetting queue to null re-arms the build-once effect
    // above, which rebuilds once the now-empty rated set actually lands.
    const handleClearAll = () => {
        setQueue(null);
        setCurrentIndex(0);
    };

    const ratingsByEntity = useMemo(() => groupRatingsByEntity(ratings ?? []), [ratings]);

    const entityByKey = useMemo(() => {
        const map = {};
        for (const entity of entities ?? []) {
            map[getEntityRatingKey(entity.entityType, entity.entityId)] = entity;
        }
        return map;
    }, [entities]);

    const ratedItems = (ratings ?? [])
        .filter(rating => rating.profile_id === user?.id)
        .map(rating => {
            const entity = entityByKey[getEntityRatingKey(rating.entity_type, rating.entity_id)];
            const isItem = entity?.entityType === 'item';
            return {
                rating,
                entity: entity && {
                    name: entity.name,
                    icon: isItem ? getItemIcon(entity) : getLocationIcon(entity),
                    photo: isItem ? getFirstItemPhoto(entity) : getFirstLocationPhoto(entity),
                    photoUrl: isItem ? getItemPhotoUrl(entity) : getLocationPhotoUrl(entity),
                },
            };
        });

    const isExhausted = currentIndex >= (queue?.length ?? 0);

    if (
        isAuthLoading ||
        !user ||
        isWorkspacesPending ||
        isEntitiesPending ||
        isRatingsPending ||
        !queue
    ) {
        return <Loading />;
    }

    if (!workspace) {
        return (
            <Empty data-block='DeckNoWorkspace'>
                <EmptyHeader>
                    <EmptyMedia variant='icon'>
                        <ThumbsUpIcon />
                    </EmptyMedia>
                    <EmptyTitle>Necesitas un espacio primero</EmptyTitle>
                    <EmptyDescription>Crea tu inventario antes de poder calificar cosas.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div
            className='fixed inset-x-0 top-12 -bottom-6 flex touch-none flex-col gap-4 overflow-hidden overscroll-none bg-hero-mesh p-4 md:static md:h-svh'
            data-block='DeckPage'
        >
            <div className='flex items-center justify-between gap-2'>
                <h1 className='font-heading text-lg font-semibold tracking-tight'>Cards</h1>
                <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
                    <DeckLocationFilter
                        workspaceId={workspace.id}
                        value={filterLocationId}
                        onChange={handleFilterChange}
                        className='w-36 sm:w-48'
                    />
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => setRatedDialogOpen(true)}
                    >
                        <ClockCounterClockwiseIcon data-icon='inline-start' />
                        Ya calificados
                    </Button>
                </div>
            </div>

            <div className='flex min-h-0 flex-1 items-center justify-center pb-4'>
                <div className='relative mx-auto aspect-2/3 w-4/5 sm:w-full sm:max-w-sm'>
                    <Deck className='size-full'>
                        <DeckCards
                            currentIndex={currentIndex}
                            onCurrentIndexChange={setCurrentIndex}
                            onSwipe={handleSwipe}
                            indexChangeDirection={indexChangeDirection}
                            stackSize={4}
                            scale={0.06}
                            className='size-full'
                        >
                            {queue.map(entity => {
                                const key = getEntityRatingKey(entity.entityType, entity.entityId);
                                return (
                                    <DeckEntityCard
                                        key={key}
                                        entity={entity}
                                        likes={ratingsByEntity[key]?.likes ?? []}
                                        dislikes={ratingsByEntity[key]?.dislikes ?? []}
                                    />
                                );
                            })}
                        </DeckCards>
                        <DeckEmpty className='rounded-4xl border-dashed'>
                            <div className='flex flex-col items-center gap-3 p-6 text-center'>
                                <p className='text-sm text-muted-foreground'>
                                    Ya no hay más por calificar.
                                </p>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={handleReshuffle}
                                >
                                    <ShuffleIcon data-icon='inline-start' />
                                    Empezar de nuevo
                                </Button>
                            </div>
                        </DeckEmpty>
                    </Deck>
                </div>
            </div>

            <div className='sticky bottom-0 -mx-4 -mb-4 border-t bg-background/80 px-4 py-3 backdrop-blur'>
                <div className='mx-auto flex w-full max-w-sm items-center gap-3'>
                    <Button
                        type='button'
                        variant='outline'
                        disabled={isExhausted}
                        onClick={() => handleButtonRate(false)}
                        className='h-11 flex-1 justify-center rounded-full border-rose-500/30 text-rose-500 hover:bg-rose-500/10 [&_svg]:size-5'
                    >
                        <ThumbsDownIcon weight='bold' data-icon='inline-start' />
                        NOPE
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        disabled={isExhausted}
                        onClick={handleSkip}
                        className='h-11 flex-1 justify-center rounded-full text-muted-foreground hover:bg-muted [&_svg]:size-5'
                    >
                        <ShuffleIcon weight='bold' data-icon='inline-start' />
                        SKIP
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        disabled={isExhausted}
                        onClick={() => handleButtonRate(true)}
                        className='h-11 flex-1 justify-center rounded-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 [&_svg]:size-5'
                    >
                        <ThumbsUpIcon weight='bold' data-icon='inline-start' />
                        YUP
                    </Button>
                </div>
            </div>

            <RatedEntitiesDialog
                open={ratedDialogOpen}
                onOpenChange={setRatedDialogOpen}
                ratedItems={ratedItems}
                workspaceId={workspace.id}
                profileId={user.id}
                onClearAll={handleClearAll}
            />
        </div>
    );
}
