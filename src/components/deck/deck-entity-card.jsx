'use client';

import { HeartIcon } from '@phosphor-icons/react/ssr';
import { DeckItem } from '@/ui/deck';
import { DeckCardPhotos } from '@/components/deck/deck-card-photos';
import { RatingAvatarStack } from '@/components/deck/rating-avatar-stack';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getEntityRatingKey } from '@/helpers/entity-ratings';
import { getItemIcon } from '@/helpers/item';
import { getLocationIcon } from '@/helpers/location';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { getSentimentalValueLabel } from '@/constants/sentimental-value';
import { cn } from '@/helpers/utils';

// DeckCards clones its top (draggable) child to inject a className — this
// must accept and forward it to the actual DeckItem underneath, or the
// drag-driven sizing/cursor classes it adds get silently dropped.
export const DeckEntityCard = ({ entity, likes, dislikes, className }) => {
    const photos = entity.entityType === 'item' ? entity.item_photos : entity.location_photos;
    const icon = entity.entityType === 'item' ? getItemIcon(entity) : getLocationIcon(entity);
    const seed = getEntityRatingKey(entity.entityType, entity.entityId);
    // Locations have no item_tags row at all (tags only apply to items).
    const tags = (entity.item_tags ?? []).map(itemTag => itemTag.tags).slice(0, 3);

    return (
        <DeckItem
            data-block='DeckEntityCard'
            className={cn(
                'flex-col items-stretch justify-start overflow-hidden border-border/40 ring-1 ring-foreground/5',
                className,
                // Pinned last: DeckCards clones the top (draggable) card with
                // its own hardcoded 'rounded-lg', which would otherwise win
                // this merge and only the cards behind it would look rounded.
                'rounded-4xl',
            )}
        >
            <div className='relative m-3 aspect-square shrink-0 overflow-hidden rounded-2xl'>
                <DeckCardPhotos photos={photos} icon={icon} seed={seed} />
                <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-2'>
                    <RatingAvatarStack ratings={dislikes} tone='dislike' className='pointer-events-auto' />
                    <RatingAvatarStack ratings={likes} tone='like' className='pointer-events-auto' />
                </div>
            </div>
            <div className='flex flex-1 flex-col gap-2 px-4 pt-1 pb-4'>
                <h2 className='truncate font-heading text-lg font-semibold tracking-tight'>
                    {entity.name}
                </h2>
                <div className='flex flex-wrap items-center gap-2'>
                    {entity.sentimental_value > 0 && (
                        <span className='inline-flex items-center gap-1 text-sm text-destructive'>
                            <HeartIcon weight='fill' />
                            {getSentimentalValueLabel(entity.sentimental_value)}
                        </span>
                    )}
                    {entity.entityType === 'item' && entity.condition && (
                        <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
                            <span className='size-1.5 shrink-0 rounded-full bg-muted-foreground' />
                            {entity.condition}
                        </span>
                    )}
                </div>
                {tags.length > 0 && (
                    <div className='flex flex-wrap items-center gap-1.5'>
                        {tags.map(tag => (
                            <span
                                key={tag.id}
                                className='flex items-center gap-1 rounded-full bg-(--tag-color)/15 px-2 py-0.5 text-xs font-medium text-(--tag-color) ring-1 ring-(--tag-color)/20'
                                style={{ '--tag-color': tag.color }}
                            >
                                <DynamicIcon icon={tag.icon ?? FALLBACK_TAG_ICON} className='size-3' />
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </DeckItem>
    );
};
