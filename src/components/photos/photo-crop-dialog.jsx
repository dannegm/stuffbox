'use client';

import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassPlusIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Slider } from '@/ui/slider';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { getPhotoCropStyle } from '@/helpers/photo-crop';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// crop_x/crop_y stay within this fraction of the box either way — past this,
// the image would sit entirely outside the visible crop on that axis.
const CROP_LIMIT = 0.5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Pan (drag the photo) + zoom (slider), backing the "Editar" button on both
// PhotoGallery's thumb and PhotoLightbox. Draft state mirrors the same
// crop_x/crop_y/zoom shape getPhotoCropStyle reads, so the live preview here
// is pixel-identical to how the photo already renders elsewhere — no
// separate cropper-library data model to convert to/from.
//
// `data-vaul-no-drag` on the pan area and the slider: on mobile,
// ResponsiveDialog renders this as a vaul Drawer, which otherwise treats any
// drag starting on a non-native-input element as its own swipe-to-dismiss
// gesture — it has no idea a Base UI Slider (or our custom pan box) is
// interactive, since neither is a real `<input>`.
export const PhotoCropDialog = ({ src, photo, open, onOpenChange, onSave }) => {
    const $preview = useRef(null);
    const $drag = useRef(null);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCropX(photo?.crop_x ?? 0);
        setCropY(photo?.crop_y ?? 0);
        setZoom(photo?.zoom ?? 1);
    }, [open, photo]);

    const handlePointerDown = event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        $drag.current = { x: event.clientX, y: event.clientY, cropX, cropY };
    };

    const handlePointerMove = event => {
        if (!$drag.current || !$preview.current) return;
        const { width, height } = $preview.current.getBoundingClientRect();
        const dx = (event.clientX - $drag.current.x) / width;
        const dy = (event.clientY - $drag.current.y) / height;
        // Dragging the photo right reveals more of its left side, i.e. the
        // object-position anchor moves the opposite way — see getPhotoCropStyle.
        setCropX(clamp($drag.current.cropX - dx, -CROP_LIMIT, CROP_LIMIT));
        setCropY(clamp($drag.current.cropY - dy, -CROP_LIMIT, CROP_LIMIT));
    };

    const handlePointerUp = () => {
        $drag.current = null;
    };

    const handleReset = () => {
        setCropX(0);
        setCropY(0);
        setZoom(1);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ crop_x: cropX, crop_y: cropY, zoom });
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='PhotoCropDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Ajustar foto</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>

                <div className='flex flex-col gap-4 px-4 sm:px-0'>
                    <div
                        ref={$preview}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        data-vaul-no-drag
                        className='relative mt-4 mx-auto aspect-square w-full max-w-64 touch-none overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10'
                    >
                        {src && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={src}
                                alt=''
                                draggable={false}
                                style={getPhotoCropStyle({ crop_x: cropX, crop_y: cropY, zoom })}
                                className='size-full scale-(--photo-zoom) cursor-grab object-cover object-(--photo-position) active:cursor-grabbing'
                            />
                        )}
                    </div>

                    <div className='flex items-center gap-3 w-full max-w-64 mx-auto my-4' data-vaul-no-drag>
                        <MagnifyingGlassPlusIcon className='size-4 shrink-0 text-muted-foreground' />
                        <Slider
                            value={zoom}
                            onValueChange={setZoom}
                            min={MIN_ZOOM}
                            max={MAX_ZOOM}
                            step={0.05}
                        />
                    </div>
                </div>

                <ResponsiveDialogFooter>
                    <Button
                        type='button'
                        variant='outline'
                        className='self-start'
                        onClick={handleReset}
                    >
                        Restablecer
                    </Button>

                    <div className='flex-1' />

                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
