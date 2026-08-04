'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CaretRightIcon, HeartIcon, LeafIcon, PencilSimpleIcon } from '@phosphor-icons/react/ssr';
import { DeckItem } from '@/ui/deck';
import { DeckCardPhotos } from '@/components/deck/deck-card-photos';
import { RatingAvatarStack } from '@/components/deck/rating-avatar-stack';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getEntityRatingKey } from '@/helpers/entity-ratings';
import { getItemIcon } from '@/helpers/item';
import { getLocationIcon } from '@/helpers/location';
import { locationAncestorsQuery } from '@/queries/locations';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { getSentimentalValueLabel } from '@/constants/sentimental-value';
import { cn } from '@/helpers/utils';

// Tags row is capped at 3 (see `tags` below), each sized as an even share of
// the row minus the gap-1.5 (0.375rem) gaps between them — a max, not a
// min, so a short tag name doesn't stretch past its content width.
const TAG_MAX_WIDTH = {
    1: 'max-w-full',
    2: 'max-w-[calc((100%-0.375rem)/2)]',
    3: 'max-w-[calc((100%-0.75rem)/3)]',
};

// DeckCards clones its top (draggable) child to inject a className — this
// must accept and forward it to the actual DeckItem underneath, or the
// drag-driven sizing/cursor classes it adds get silently dropped.
export const DeckEntityCard = ({ entity, likes, dislikes, className, showRootLocation }) => {
    const photos = entity.entityType === 'item' ? entity.item_photos : entity.location_photos;
    const icon = entity.entityType === 'item' ? getItemIcon(entity) : getLocationIcon(entity);
    const seed = getEntityRatingKey(entity.entityType, entity.entityId);
    // Locations have no item_tags row at all (tags only apply to items).
    const tags = (entity.item_tags ?? []).map(itemTag => itemTag.tags).slice(0, 3);
    const editHref =
        entity.entityType === 'item'
            ? `/item/${entity.entityId}`
            : `/location/${entity.entityId}/edit`;
    // Ancestors are root-first and inclusive of containerId itself, so [0] is
    // the root and [1] is one level below it. The root is only worth showing
    // when the deck isn't already scoped to one location via showRootLocation
    // — with a location filter active, every card sits under the same root,
    // so it'd just be noise repeated on every card.
    const { data: locationAncestors = [] } = useQuery(locationAncestorsQuery(entity.containerId));
    const [rootLocation, childLocation] = locationAncestors;
    const showRoot = showRootLocation && !!rootLocation;
    const showChild = !!childLocation;

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
                <Link
                    href={editHref}
                    aria-label='Editar'
                    // The whole card sits inside DeckCards' drag="x" gesture —
                    // without stopping propagation here, a tap on this button
                    // also arms/starts that drag, so the link never gets a
                    // clean click.
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => event.stopPropagation()}
                    className='absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs backdrop-blur-sm transition-colors hover:bg-background [&_svg]:size-4'
                >
                    <PencilSimpleIcon weight='bold' />
                </Link>
                <div className='pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-2'>
                    {/* Two fixed slots, not just two children of a justify-between
                        row — RatingAvatarStack returns null when empty, and with
                        only one real child left, justify-between would collapse
                        it to the start regardless of which side it was. */}
                    <div className='pointer-events-auto'>
                        <RatingAvatarStack ratings={dislikes} tone='dislike' chip />
                    </div>
                    <div className='pointer-events-auto'>
                        <RatingAvatarStack ratings={likes} tone='like' chip />
                    </div>
                </div>
            </div>

            <div className='flex flex-1 flex-col gap-1 px-4 pt-1 pb-4'>
                <div className='flex items-center gap-2'>
                    <h2 className='truncate font-heading text-lg font-semibold leading-tight tracking-tight'>
                        {entity.name}
                    </h2>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                    {entity.sentimental_value > 0 && (
                        <span className='inline-flex items-center gap-1 text-sm text-destructive'>
                            <HeartIcon weight='fill' />
                            {getSentimentalValueLabel(entity.sentimental_value)}
                        </span>
                    )}
                    {entity.entityType === 'item' && entity.condition && (
                        <span className='inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground'>
                            <span className='size-1.5 shrink-0 rounded-full bg-muted-foreground' />
                            <span className='min-w-0 truncate'>{entity.condition}</span>
                        </span>
                    )}
                </div>

                {tags.length > 0 && (
                    <div className='flex items-center gap-1.5'>
                        {tags.map(tag => (
                            <span
                                key={tag.id}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full bg-(--tag-color)/15 px-2 py-0.5 text-xs font-medium text-(--tag-color) ring-1 ring-(--tag-color)/20',
                                    TAG_MAX_WIDTH[tags.length],
                                )}
                                style={{ '--tag-color': tag.color }}
                            >
                                <DynamicIcon
                                    icon={tag.icon ?? FALLBACK_TAG_ICON}
                                    className='size-3 shrink-0'
                                />
                                <span className='min-w-0 truncate'>{tag.name}</span>
                            </span>
                        ))}
                    </div>
                )}

                {(entity.itemsCount > 1 || showRoot || showChild) && (
                    <div className='mt-auto flex items-center gap-1.5 pt-1'>
                        {(showRoot || showChild) && (
                            <span className='inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10'>
                                {showRoot && (
                                    <>
                                        <DynamicIcon
                                            icon={getLocationIcon(rootLocation)}
                                            className='size-3 shrink-0'
                                        />
                                        <span className='truncate'>{rootLocation.name}</span>
                                    </>
                                )}
                                {showRoot && showChild && (
                                    <CaretRightIcon className='size-3 shrink-0' />
                                )}
                                {showChild && (
                                    <>
                                        <DynamicIcon
                                            icon={getLocationIcon(childLocation)}
                                            className='size-3 shrink-0'
                                        />
                                        <span className='truncate'>{childLocation.name}</span>
                                    </>
                                )}
                            </span>
                        )}
                        {entity.itemsCount > 1 && (
                            <span className='ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
                                <LeafIcon className='size-3.5' />
                                {entity.itemsCount}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </DeckItem>
    );
};
