'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { EyeIcon, PackageIcon, LeafIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { PackedTape } from '@/components/moves/packed-tape';
import {
    getLocationIcon,
    getLocationPhotoUrl,
    getFirstLocationPhoto,
    getLocationPhotos,
} from '@/helpers/location';
import { cn } from '@/helpers/utils';

// Card-grid counterpart to LocationListItem — same selection/drag/drop/
// packed/counts props, laid out as a photo-forward card. See ItemCardItem
// for why the eye overlay is pointer-events-none until group-hover.
export const LocationCardItem = ({
    location,
    counts,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
    droppable = false,
}) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const photoUrl = getLocationPhotoUrl(location);
    const photo = getFirstLocationPhoto(location);
    const photos = getLocationPhotos(location);

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({ id: location.id, data: dragData, disabled: !draggable });
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: location.id,
        disabled: !droppable,
    });
    const setRefs = node => {
        setDragRef(node);
        setDropRef(node);
    };
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
        isOver && 'border-primary bg-primary/10 ring-2 ring-primary/40',
    );

    const content = (
        <>
            <div className='p-2 pb-0'>
                <div className='group relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-muted'>
                    {location.active_move_id && <PackedTape />}
                    <div className='absolute inset-0 z-1'>
                        {photoUrl ? (
                            <CroppedPhoto src={photoUrl} photo={photo} />
                        ) : (
                            <span className='flex size-full items-center justify-center text-foreground [&_svg]:size-8'>
                                <DynamicIcon icon={getLocationIcon(location)} />
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
                                onCheckedChange={() => onToggle(location.id)}
                            />
                        </span>
                    )}
                    {!selectable && photos.length > 0 && (
                        <span
                            role='button'
                            tabIndex={0}
                            aria-label='Ver fotos'
                            onClick={openLightbox}
                            onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') openLightbox(event);
                            }}
                            className='absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:bg-black/40 group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:bg-black/40 focus-visible:opacity-100'
                        >
                            <EyeIcon weight='fill' className='size-6 text-white' />
                        </span>
                    )}
                </div>
            </div>
            <div className='flex min-w-0 flex-col gap-1 p-2'>
                <Tooltip>
                    <TooltipTrigger render={<span className='block truncate font-medium' />}>
                        {location.name}
                    </TooltipTrigger>
                    <TooltipContent>{location.name}</TooltipContent>
                </Tooltip>
                <div className='flex min-h-4 items-center justify-between gap-2 text-xs text-muted-foreground'>
                    <span className='truncate capitalize'>{location.type}</span>
                    {(counts?.locations > 0 || counts?.items > 0) && (
                        <span className='flex shrink-0 items-center gap-2'>
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
                    ref={setRefs}
                    type='button'
                    data-block='LocationCardItem'
                    className={className}
                    onClick={() => onToggle(location.id)}
                    {...dragProps}
                >
                    {content}
                </button>
            ) : (
                <Link
                    ref={setRefs}
                    href={`/location/${location.id}`}
                    data-block='LocationCardItem'
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
