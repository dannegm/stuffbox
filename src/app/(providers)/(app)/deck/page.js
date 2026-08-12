'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ClockCounterClockwiseIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    ShuffleIcon,
    ArrowUUpLeftIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useSettings } from '@/hooks/use-settings';
import { workspacesQuery } from '@/queries/workspaces';
import {
    deckQueueQuery,
    entityRatingsQuery,
    rateEntityMutation,
    deleteEntityRatingMutation,
} from '@/queries/entity-ratings';
import { locationDescendantIdsQuery } from '@/queries/locations';
import { workspaceSettingQuery } from '@/queries/workspace-settings';
import { getEntityRatingKey, groupRatingsByEntity } from '@/helpers/entity-ratings';
import { buildDeckQueue } from '@/helpers/deck';
import { getItemIcon, getFirstItemPhoto, getItemPhotoUrl, getItemPhotos } from '@/helpers/item';
import {
    getLocationIcon,
    getFirstLocationPhoto,
    getLocationPhotoUrl,
    getLocationPhotos,
} from '@/helpers/location';
import { PHOTO_SIZE } from '@/helpers/photos';
import { Deck, DeckCards, DeckEmpty, swipeExitSpec } from '@/ui/deck';
import { DeckEntityCard } from '@/components/deck/deck-entity-card';
import { DeckLocationFilter } from '@/components/deck/deck-location-filter';
import { RatedEntitiesDialog } from '@/components/deck/rated-entities-dialog';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

// How many cards of the already-shuffled queue get handed to <DeckCards> at
// once — the full queue can be 500+ entities long, and there's no reason to
// mount that many DeckEntityCard elements up front when the stack only ever
// shows `stackSize` of them.
const PAGE_SIZE = 10;

// A skip slides straight down, tilting randomly left or right each time —
// distinct from a like/dislike's fixed, direction-matched tilt (swipeExitSpec)
// so it reads as "set aside for later" rather than a judgment.
const skipExitSpec = () => ({
    axis: 'y',
    sign: 1,
    rotate: (Math.random() < 0.5 ? -1 : 1) * 25,
});

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
    // How much of `queue` has been revealed to <DeckCards> so far — grown in
    // PAGE_SIZE steps as currentIndex approaches the end of what's loaded,
    // instead of handing the whole (potentially 500+ entity) queue over at
    // once. Reset alongside queue itself (see the queue-build effect below).
    const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);
    const [currentIndex, setCurrentIndex] = useState(0);
    // {axis, sign, rotate} — how the next programmatic exit/entrance should
    // look; see swipeExitSpec/skipExitSpec below.
    const [deckExitSpec, setDeckExitSpec] = useState(() => swipeExitSpec('left'));
    // Bumped whenever the deck resets wholesale (reshuffle/filter/clear-all)
    // instead of stepping one card at a time — tells <DeckCards> to snap
    // straight to index 0 with no exit/entrance animation, since that jump
    // would otherwise look indistinguishable from a one-step undo.
    const [deckResetToken, setDeckResetToken] = useState(0);
    const [ratedDialogOpen, setRatedDialogOpen] = useState(false);
    // Every rate/skip from this session, oldest first — {index, ratingId,
    // exitSpec}, ratingId null for a skip (nothing written to undo). Undo
    // pops from the end, so the whole session can be walked back one step
    // at a time. Reset alongside the queue itself (reshuffle/filter/clear),
    // since recorded indices only make sense against the queue they came from.
    const [actionHistory, setActionHistory] = useState([]);
    // null = "todas las ubicaciones" (no filtering) — the fallback if the
    // workspace has no deckDefaultLocationId set either.
    const [filterLocationId, setFilterLocationId] = useState(null);
    // Distinct from filterLocationId itself so the queue-build effect below
    // can wait for the workspace default to actually land before building —
    // otherwise it can build once against the null starting value in the
    // same render pass the default arrives in, and never rebuild (setQueue
    // only fires while queue is still null).
    const [isDefaultLocationResolved, setIsDefaultLocationResolved] = useState(false);
    const $hasAppliedDefaultLocation = useRef(false);

    const { data: deckDefaultLocationId, isPending: isDeckDefaultPending } = useQuery(
        workspaceSettingQuery(workspace?.id, 'deckDefaultLocationId', { enabled: !!workspace?.id }),
    );

    // Applies the workspace's default exactly once per page load — changing
    // the filter afterwards (handleFilterChange) is local/session-only by
    // design and must never get silently overwritten by this effect if the
    // setting itself refetches in the background.
    useEffect(() => {
        if ($hasAppliedDefaultLocation.current || isDeckDefaultPending) return;
        $hasAppliedDefaultLocation.current = true;
        setFilterLocationId(deckDefaultLocationId ?? null);
        setIsDefaultLocationResolved(true);
    }, [isDeckDefaultPending, deckDefaultLocationId]);

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

    // Debug-only sanity check for the queue split (buildDeckQueue does the
    // exact same rated/unrated partitioning) — surfaces here as plain
    // numbers so a "why do I keep seeing the same cards" report is either
    // confirmed as a small unrated pool or ruled out.
    const debugCounts = useMemo(() => {
        if (!filteredEntities) return null;
        const total = filteredEntities.length;
        const rated = filteredEntities.filter(entity =>
            ratedKeys.has(getEntityRatingKey(entity.entityType, entity.entityId)),
        ).length;
        return { total, rated, unrated: total - rated };
    }, [filteredEntities, ratedKeys]);

    // Builds the queue exactly once, when data first arrives — recomputing it
    // on every refetch (e.g. after each vote invalidates entity-ratings)
    // would reshuffle the deck out from under the card being looked at.
    // Also waits out the workspace default (isDefaultLocationResolved) and,
    // once a filter is active, the descendant-ids fetch — otherwise the
    // queue can build once against a stale/partial allow-list and never
    // rebuild (queue only gets set while still null).
    useEffect(() => {
        if (queue || !filteredEntities || !ratings || !user) return;
        if (!isDefaultLocationResolved) return;
        if (filterLocationId && isDescendantIdsPending) return;
        setQueue(buildDeckQueue(filteredEntities, ratedKeys));
        setLoadedCount(PAGE_SIZE);
    }, [
        filteredEntities,
        ratings,
        user,
        queue,
        ratedKeys,
        filterLocationId,
        isDescendantIdsPending,
        isDefaultLocationResolved,
    ]);

    // Reveals the next page once the stack is about to run into the edge of
    // what's currently loaded — stackSize (4) cards ahead of currentIndex is
    // the same lookahead <DeckCards> itself renders, so a new page is always
    // in place before it'd actually be visible.
    useEffect(() => {
        if (!queue) return;
        if (currentIndex + 4 >= loadedCount && loadedCount < queue.length) {
            setLoadedCount(count => Math.min(count + PAGE_SIZE, queue.length));
        }
    }, [currentIndex, queue, loadedCount]);

    const visibleQueue = useMemo(() => queue?.slice(0, loadedCount) ?? [], [queue, loadedCount]);

    const handleFilterChange = nextLocationId => {
        setFilterLocationId(nextLocationId);
        setQueue(null);
        setLoadedCount(PAGE_SIZE);
        setCurrentIndex(0);
        setActionHistory([]);
        setDeckResetToken(token => token + 1);
    };

    const { mutate: rate } = useMutation(
        rateEntityMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspace?.id] }),
        }),
    );

    const { mutate: deleteRating } = useMutation(
        deleteEntityRatingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspace?.id] }),
        }),
    );

    const rateEntity = (entity, liked, index, exitSpec) => {
        // Debug mode is for poking at the swipe/animation behavior without
        // polluting entity_ratings with throwaway votes — the card still
        // advances, nothing gets written. Undo still just walks the index
        // back in that case, since there's no rating to delete.
        if (debug) {
            setActionHistory(history => [...history, { index, ratingId: null, exitSpec }]);
            return;
        }
        rate(
            {
                workspaceId: workspace.id,
                entityType: entity.entityType,
                entityId: entity.entityId,
                profileId: user.id,
                liked,
            },
            {
                onSuccess: data =>
                    setActionHistory(history => [
                        ...history,
                        { index, ratingId: data.id, exitSpec },
                    ]),
            },
        );
    };

    const handleSwipe = (index, direction) => {
        const entity = queue?.[index];
        if (entity) rateEntity(entity, direction === 'right', index, swipeExitSpec(direction));
    };

    const handleButtonRate = liked => {
        const entity = queue?.[currentIndex];
        if (!entity) return;
        const exitSpec = swipeExitSpec(liked ? 'right' : 'left');
        rateEntity(entity, liked, currentIndex, exitSpec);
        setDeckExitSpec(exitSpec);
        setCurrentIndex(index => index + 1);
    };

    // No rating written — just moves past a card the user isn't sure about
    // yet, without it counting as "already rated" (buildDeckQueue only
    // excludes ratedKeys, so a skipped entity resurfaces on the next
    // reshuffle instead of being lost).
    const handleSkip = () => {
        const entity = queue?.[currentIndex];
        if (!entity) return;
        const exitSpec = skipExitSpec();
        setActionHistory(history => [
            ...history,
            { index: currentIndex, ratingId: null, exitSpec },
        ]);
        setDeckExitSpec(exitSpec);
        setCurrentIndex(index => index + 1);
    };

    // Takes back the most recent not-yet-undone rate/skip: deletes the
    // rating it wrote (if any) and walks currentIndex back to that card's
    // position — queue itself is a static array, so rewinding the pointer is
    // exactly "put it back on top of the deck", no reordering needed. Since
    // every action always advances currentIndex by exactly one, the history
    // is just a stack of consecutive positions — popping it one at a time
    // walks all the way back through the current session. Reuses each
    // action's own exit spec so <DeckCards> can mirror it on the way back in.
    const handleUndo = () => {
        if (actionHistory.length === 0) return;
        const last = actionHistory[actionHistory.length - 1];
        if (last.ratingId) deleteRating(last.ratingId);
        setDeckExitSpec(last.exitSpec);
        setCurrentIndex(last.index);
        setActionHistory(history => history.slice(0, -1));
    };

    const handleReshuffle = () => {
        if (!filteredEntities) return;
        setQueue(buildDeckQueue(filteredEntities, ratedKeys));
        setLoadedCount(PAGE_SIZE);
        setCurrentIndex(0);
        setActionHistory([]);
        setDeckResetToken(token => token + 1);
    };

    // After the danger-zone "clear all" action, ratedKeys is still stale
    // (the entity-ratings invalidation it triggers refetches in the
    // background) — resetting queue to null re-arms the build-once effect
    // above, which rebuilds once the now-empty rated set actually lands.
    const handleClearAll = () => {
        setQueue(null);
        setLoadedCount(PAGE_SIZE);
        setCurrentIndex(0);
        setActionHistory([]);
        setDeckResetToken(token => token + 1);
    };

    // Space to skip, Cmd/Ctrl+Z to undo — ignored while the ratings dialog is
    // open (it has its own search input) or while any other field has focus,
    // so typing a space or hitting Cmd+Z elsewhere doesn't hijack the deck.
    useEffect(() => {
        if (ratedDialogOpen) return;

        const handleKeyDown = event => {
            const target = event.target;
            const isEditable =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;
            if (isEditable) return;

            if (event.code === 'Space') {
                event.preventDefault();
                handleSkip();
            } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                handleUndo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ratedDialogOpen, handleSkip, handleUndo]);

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
                    entityType: entity.entityType,
                    entityId: entity.entityId,
                    name: entity.name,
                    icon: isItem ? getItemIcon(entity) : getLocationIcon(entity),
                    photo: isItem ? getFirstItemPhoto(entity) : getFirstLocationPhoto(entity),
                    photoUrl: isItem
                        ? getItemPhotoUrl(entity, PHOTO_SIZE.LIST)
                        : getLocationPhotoUrl(entity, PHOTO_SIZE.LIST),
                    photos: isItem
                        ? getItemPhotos(entity, PHOTO_SIZE.LIGHTBOX)
                        : getLocationPhotos(entity, PHOTO_SIZE.LIGHTBOX),
                    containerId: entity.containerId,
                    active_move_id: entity.active_move_id,
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
                <div className='flex items-center gap-1.5'>
                    <h1 className='font-heading text-lg font-semibold tracking-tight'>Cards</h1>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon-sm'
                                    disabled={actionHistory.length === 0}
                                    onClick={handleUndo}
                                />
                            }
                        >
                            <ArrowUUpLeftIcon />
                            <span className='sr-only'>Deshacer</span>
                        </TooltipTrigger>
                        <TooltipContent side='bottom'>Deshacer (⌘Z)</TooltipContent>
                    </Tooltip>
                </div>
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
                        onClick={() => setRatedDialogOpen(true)}
                    >
                        <ClockCounterClockwiseIcon data-icon='inline-start' />
                        Historial
                    </Button>
                </div>
            </div>

            {debug && debugCounts && (
                <div
                    className='rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground'
                    data-block='DeckDebugCounts'
                >
                    {debugCounts.total} traídos · {debugCounts.unrated} sin calificar ·{' '}
                    {debugCounts.rated} calificados · cola: {queue?.length ?? 0} · cargados:{' '}
                    {loadedCount}
                </div>
            )}

            <div className='flex min-h-0 flex-1 items-center justify-center pb-4'>
                <div className='relative mx-auto aspect-2/3 w-4/5 sm:w-full sm:max-w-sm'>
                    <Deck className='size-full'>
                        <DeckCards
                            currentIndex={currentIndex}
                            onCurrentIndexChange={setCurrentIndex}
                            onSwipe={handleSwipe}
                            exitSpec={deckExitSpec}
                            resetToken={deckResetToken}
                            stackSize={4}
                            scale={0.06}
                            className='size-full'
                        >
                            {visibleQueue.map(entity => {
                                const key = getEntityRatingKey(entity.entityType, entity.entityId);
                                return (
                                    <DeckEntityCard
                                        key={key}
                                        entity={entity}
                                        likes={ratingsByEntity[key]?.likes ?? []}
                                        dislikes={ratingsByEntity[key]?.dislikes ?? []}
                                        showRootLocation={!filterLocationId}
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

            <div className='sticky bottom-0 -mx-4 border-t bg-background/80 px-4 pt-3 -mb-4 backdrop-blur ios:mobile:pb-2'>
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
