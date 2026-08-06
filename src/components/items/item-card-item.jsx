'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { EyeIcon, ThumbsUpIcon, ThumbsDownIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { PackedTapeCard } from '@/components/moves/packed-tape';
import { getItemIcon, getItemPhotoUrl, getFirstItemPhoto, getItemPhotos } from '@/helpers/item';
import { cn } from '@/helpers/utils';

// Card-grid counterpart to ItemListRow — same selection/drag/packed/rating
// props, laid out as a photo-forward card instead of a row. The eye overlay
// is `pointer-events-none` until `group-hover` turns it on, so it never
// swallows the tap-to-navigate/select gesture on touch devices (which have
// no hover state to begin with).
export const ItemCardItem = ({
    item,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
    likeCount = 0,
    dislikeCount = 0,
}) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const photoUrl = getItemPhotoUrl(item);
    const photo = getFirstItemPhoto(item);
    const photos = getItemPhotos(item);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: dragData,
        disabled: !draggable,
    });
    const dragProps = draggable ? { ...attributes, ...listeners } : {};

    const openLightbox = event => {
        event.preventDefault();
        event.stopPropagation();
        setLightboxIndex(0);
    };

    const className = cn(
        'relative flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10',
        selected && 'border-primary bg-primary/5',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
    );

    const content = (
        <>
            {item.active_move_id && <PackedTapeCard className='absolute w-full h-6 z-0' />}
            <div className='p-2 pb-0'>
                <div className='group relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-muted'>
                    <div className='absolute inset-0 z-1'>
                        {photoUrl ? (
                            <CroppedPhoto src={photoUrl} photo={photo} />
                        ) : (
                            <span className='flex size-full items-center justify-center text-foreground [&_svg]:size-8'>
                                <DynamicIcon icon={getItemIcon(item)} />
                            </span>
                        )}
                    </div>
                    {selectable && (
                        <span
                            className='absolute top-2 left-2 z-20 flex cursor-default items-center justify-center rounded-full bg-background/90 p-1 shadow-xs shadow-black/20 ring-1 ring-foreground/10'
                            onClick={event => event.stopPropagation()}
                        >
                            <Checkbox
                                checked={selected}
                                onCheckedChange={() => onToggle(item.id)}
                            />
                        </span>
                    )}
                    {!selectable && photos.length > 0 && (
                        <span className='absolute inset-0 z-10 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto'>
                            <span
                                className='flex h-3/5 w-3/5 items-center justify-center opacity-0 bg-black/40 hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded-xl'
                                role='button'
                                tabIndex={0}
                                aria-label='Ver fotos'
                                onClick={openLightbox}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' || event.key === ' ')
                                        openLightbox(event);
                                }}
                            >
                                <EyeIcon weight='fill' className='size-6 text-white' />
                            </span>
                        </span>
                    )}
                </div>
            </div>
            <div className='flex min-w-0 flex-col gap-1 p-2'>
                <Tooltip>
                    <TooltipTrigger render={<span className='block truncate font-medium' />}>
                        {item.name}
                    </TooltipTrigger>
                    <TooltipContent>{item.name}</TooltipContent>
                </Tooltip>
                <div className='flex min-h-4 items-center gap-2 text-xs text-muted-foreground'>
                    {item.quantity > 1 && <span className='shrink-0'>×{item.quantity}</span>}
                    {(likeCount > 0 || dislikeCount > 0) && (
                        <span className='flex shrink-0 items-center gap-1.5'>
                            {likeCount > 0 && (
                                <span className='flex items-center gap-0.5 text-emerald-600 [&_svg]:size-3'>
                                    <ThumbsUpIcon weight='fill' />
                                    {likeCount}
                                </span>
                            )}
                            {dislikeCount > 0 && (
                                <span className='flex items-center gap-0.5 text-rose-600 [&_svg]:size-3'>
                                    <ThumbsDownIcon weight='fill' />
                                    {dislikeCount}
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <>
            {selectable ? (
                <button
                    ref={setNodeRef}
                    type='button'
                    data-block='ItemCardItem'
                    className={className}
                    onClick={() => onToggle(item.id)}
                    {...dragProps}
                >
                    {content}
                </button>
            ) : (
                <Link
                    ref={setNodeRef}
                    href={`/item/${item.id}`}
                    data-block='ItemCardItem'
                    className={className}
                    {...dragProps}
                >
                    {content}
                </Link>
            )}
            <PhotoLightbox
                photos={photos}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
            />
        </>
    );
};
