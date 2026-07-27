'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUpIcon, ThumbsDownIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { rateEntityMutation, deleteEntityRatingMutation } from '@/queries/entity-ratings';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { cn } from '@/helpers/utils';

// A like/dislike toggle for the entity a detail page is itself showing (the
// deck's own YUP/NOPE bar is a swipe-and-advance flow, not this — this
// reflects and changes the current user's own vote on one fixed entity).
// Clicking the already-active value un-rates (delete) rather than leaving it
// stuck liked/disliked forever — entity_ratings' unique(entity_type,
// entity_id, profile_id) means each user only ever has one row per entity,
// so switching values is an upsert and re-clicking the active one deletes it.
export const RatingToggle = ({ workspaceId, entityType, entityId, ratings = [], className }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const ownRating = ratings.find(rating => rating.profile_id === user.id);
    const likeCount = ratings.filter(rating => rating.liked).length;
    const dislikeCount = ratings.length - likeCount;

    // Invalidates both this entity's own query and the workspace-wide one
    // (entityRatingsQuery) — the latter backs children-list counts (e.g. an
    // item's like/dislike shown on its location's item row) and the deck.
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspaceId] });
        queryClient.invalidateQueries({
            queryKey: ['entity-ratings', 'entity', entityType, entityId],
        });
    };

    const { mutate: rate, isPending: isRating } = useMutation(
        rateEntityMutation({ onSuccess: invalidate }),
    );
    const { mutate: unrate, isPending: isUnrating } = useMutation(
        deleteEntityRatingMutation({ onSuccess: invalidate }),
    );
    const isPending = isRating || isUnrating;

    const handleClick = liked => {
        if (ownRating?.liked === liked) {
            unrate(ownRating.id);
        } else {
            rate({ workspaceId, entityType, entityId, profileId: user.id, liked });
        }
    };

    return (
        <div className={cn('flex items-center gap-1', className)} data-block='RatingToggle'>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={isPending}
                            onClick={() => handleClick(true)}
                            className={cn(
                                ownRating?.liked === true &&
                                    'border-emerald-600/40 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/15 hover:text-emerald-600',
                            )}
                        />
                    }
                >
                    <ThumbsUpIcon
                        data-icon='inline-start'
                        weight={ownRating?.liked === true ? 'fill' : 'regular'}
                    />
                    <span className='hidden sm:inline'>YUP</span>
                </TooltipTrigger>
                <TooltipContent>
                    {likeCount > 0 ? `Le gusta a ${likeCount}` : 'Me gusta'}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={isPending}
                            onClick={() => handleClick(false)}
                            className={cn(
                                ownRating?.liked === false &&
                                    'border-rose-600/40 bg-rose-600/10 text-rose-600 hover:bg-rose-600/15 hover:text-rose-600',
                            )}
                        />
                    }
                >
                    <ThumbsDownIcon
                        data-icon='inline-start'
                        weight={ownRating?.liked === false ? 'fill' : 'regular'}
                    />
                    <span className='hidden sm:inline'>NOPE</span>
                </TooltipTrigger>
                <TooltipContent>
                    {dislikeCount > 0 ? `No le gusta a ${dislikeCount}` : 'No me gusta'}
                </TooltipContent>
            </Tooltip>
        </div>
    );
};
