'use client';

import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Pan + zoom, backing the "Editar" button on both PhotoGallery's thumb and
// PhotoLightbox — react-easy-crop is UI only here, never its canvas export
// (db.sql: "Square-masked at render, never physically cropped"; stuffbox-plan.md
// §4: "crop_x/zoom = react-easy-crop pan/zoom output"). We read its own
// `crop`/`zoom` state and store crop_x/crop_y as a fraction of its (measured
// via onCropSizeChange) crop area size — see getPhotoCropStyle
// (src/helpers/photo-crop.js) for why a fraction, not raw pixels: it lets
// CroppedPhoto (src/ui/cropped-photo.jsx) replicate the exact same
// translate()+scale() react-easy-crop applies internally, at any container
// size, without either component needing to know the other's pixel
// dimensions.
export const PhotoCropDialog = ({ src, photo, open, onOpenChange, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropSize, setCropSize] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // cropSize is only known once react-easy-crop has measured its own
    // container (onCropSizeChange), so the fraction→px conversion waits for
    // it — negligible delay in practice (first paint).
    useEffect(() => {
        if (!open || !cropSize) return;
        setCrop({
            x: (photo?.crop_x ?? 0) * cropSize.width,
            y: (photo?.crop_y ?? 0) * cropSize.height,
        });
        setZoom(photo?.zoom ?? 1);
    }, [open, photo, cropSize]);

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleSave = async () => {
        if (!cropSize) return;
        setIsSaving(true);
        try {
            await onSave({
                crop_x: crop.x / cropSize.width,
                crop_y: crop.y / cropSize.height,
                zoom,
            });
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
                        data-vaul-no-drag
                        className='relative mx-auto mt-4 aspect-square w-full max-w-64 overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10'
                    >
                        {src && (
                            <Cropper
                                image={src}
                                crop={crop}
                                zoom={zoom}
                                minZoom={MIN_ZOOM}
                                maxZoom={MAX_ZOOM}
                                aspect={1}
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropSizeChange={setCropSize}
                            />
                        )}
                    </div>

                    <div
                        className='mx-auto my-4 flex w-full max-w-64 items-center gap-3'
                        data-vaul-no-drag
                    >
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

                    <Button onClick={handleSave} disabled={isSaving || !cropSize}>
                        {isSaving && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
