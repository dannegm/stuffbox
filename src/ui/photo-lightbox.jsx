'use client';

import { useEffect, useState } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon, PencilSimpleIcon } from '@phosphor-icons/react/ssr';
import { Button } from '@/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/ui/carousel';
import { cn } from '@/helpers/utils';

// Fullscreen image viewer for PhotoGallery — a bespoke Popup (not
// DialogContent's centered card) since a lightbox wants the photo itself as
// the focal point, not a chrome-heavy dialog. Swipe/drag navigation is
// embla's (via Carousel), not hand-rolled touch math — it already handles
// the drag-vs-tap distinction, native image-drag suppression, and
// touch-action correctly. Click anywhere on the dark backdrop closes it; the
// carousel and its own controls stop that click from bubbling. `photos` is
// `[{ src, cropStyle, raw }]` — resolving r2_key/previewUrl into a url and
// crop_x/crop_y/zoom into cropStyle (getPhotoCropStyle, src/helpers/photo-crop.js)
// is the caller's job, so this stays a dumb viewer; `raw` (the original photo
// row) is only forwarded to `onEditPhoto`, never read here. `onEditPhoto` is
// optional — omit it to hide the edit button entirely.
export const PhotoLightbox = ({ photos, index, onIndexChange, onClose, onEditPhoto }) => {
    const open = index !== null && index !== undefined;
    const hasMultiple = photos.length > 1;
    const [api, setApi] = useState();

    // Carousel only mounts while open (below), so `opts.startIndex` — read
    // once at embla's init — is always fresh for whichever photo was
    // clicked, without needing to imperatively scrollTo on every open.
    useEffect(() => {
        if (!api) return;
        const onSelect = () => onIndexChange(api.selectedScrollSnap());
        api.on('select', onSelect);
        return () => api.off('select', onSelect);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={next => !next && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Backdrop
                    data-slot='photo-lightbox-overlay'
                    className='fixed inset-0 z-50 bg-black/85 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
                />
                <DialogPrimitive.Popup
                    data-slot='photo-lightbox-content'
                    data-block='PhotoLightbox'
                    className='fixed inset-0 z-50 flex items-center justify-center p-4 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
                    onClick={onClose}
                >
                    {open && (
                        <Carousel
                            opts={{ startIndex: index, loop: true }}
                            setApi={setApi}
                            onClick={event => event.stopPropagation()}
                            className='aspect-square w-[min(32rem,calc(100vw-2rem),calc(100dvh-2rem))]'
                        >
                            <CarouselContent className='ml-0 h-full'>
                                {photos.map((photo, photoIndex) => (
                                    <CarouselItem
                                        key={photoIndex}
                                        className='flex h-full items-center justify-center pl-0'
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.src}
                                            alt=''
                                            draggable={false}
                                            style={photo.cropStyle}
                                            className='size-full scale-(--photo-zoom) rounded-2xl object-cover object-(--photo-position) shadow-lg shadow-black/40'
                                        />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            {hasMultiple && (
                                <>
                                    <CarouselPrevious
                                        variant='ghost'
                                        aria-label='Foto anterior'
                                        className='-left-2 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:-left-14'
                                    />
                                    <CarouselNext
                                        variant='ghost'
                                        aria-label='Foto siguiente'
                                        className='-right-2 bg-black/40 text-white hover:bg-black/60 hover:text-white sm:-right-14'
                                    />
                                    <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5'>
                                        {photos.map((_, dotIndex) => (
                                            <span
                                                key={dotIndex}
                                                className={cn('size-1.5 rounded-full bg-white/40', {
                                                    'bg-white': dotIndex === index,
                                                })}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </Carousel>
                    )}

                    {open && onEditPhoto && (
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            aria-label='Editar foto'
                            onClick={event => {
                                event.stopPropagation();
                                onEditPhoto(photos[index].raw);
                            }}
                            className='absolute top-4 left-4 bg-black/40 text-white hover:bg-black/60 hover:text-white'
                        >
                            <PencilSimpleIcon />
                        </Button>
                    )}

                    <DialogPrimitive.Close
                        data-slot='photo-lightbox-close'
                        aria-label='Cerrar'
                        onClick={event => event.stopPropagation()}
                        render={
                            <Button
                                variant='ghost'
                                size='icon-sm'
                                className='absolute top-4 right-4 bg-black/40 text-white hover:bg-black/60 hover:text-white'
                            />
                        }
                    >
                        <XIcon />
                        <span className='sr-only'>Cerrar</span>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
