'use client';

import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import {
    ArrowClockwiseIcon,
    ArrowCounterClockwiseIcon,
    FlipHorizontalIcon,
    FlipVerticalIcon,
    MagnifyingGlassPlusIcon,
} from '@phosphor-icons/react/ssr';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { getPhotoFlipStyle } from '@/helpers/photo-crop';
import { cn } from '@/helpers/utils';

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
    const [rotation, setRotation] = useState(0);
    const [flipX, setFlipX] = useState(false);
    const [flipY, setFlipY] = useState(false);
    const [cropSize, setCropSize] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    // Guards the initialization effect below to run exactly once per dialog
    // open, not every time cropSize changes reference — see its comment.
    const $hasInitialized = useRef(false);

    // cropSize is only known once react-easy-crop has measured its own
    // container (onCropSizeChange), so the fraction→px conversion waits for
    // it — negligible delay in practice (first paint). Guarded by
    // $hasInitialized rather than depending on cropSize alone: react-easy-
    // crop's own componentDidUpdate calls computeSizes() (which re-emits
    // onCropSizeChange with a *new* cropSize object) whenever `rotation`
    // changes — but NOT for zoom/crop pan changes. Without the guard, every
    // rotate click fed a fresh cropSize back into this effect's deps, which
    // re-ran and reset `rotation` straight back to the original photo value
    // in the same tick — rotating always appeared to do nothing.
    useEffect(() => {
        if (!open) {
            $hasInitialized.current = false;
            return;
        }
        if (!cropSize || $hasInitialized.current) return;
        $hasInitialized.current = true;
        setCrop({
            x: (photo?.crop_x ?? 0) * cropSize.width,
            y: (photo?.crop_y ?? 0) * cropSize.height,
        });
        setZoom(photo?.zoom ?? 1);
        setRotation(photo?.rotation ?? 0);
        setFlipX(photo?.flip_x ?? false);
        setFlipY(photo?.flip_y ?? false);
    }, [open, photo, cropSize]);

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setFlipX(false);
        setFlipY(false);
    };

    const rotateLeft = () => setRotation(current => (current - 90 + 360) % 360);
    const rotateRight = () => setRotation(current => (current + 90) % 360);

    const handleSave = async () => {
        if (!cropSize) return;
        setIsSaving(true);
        try {
            await onSave({
                crop_x: crop.x / cropSize.width,
                crop_y: crop.y / cropSize.height,
                zoom,
                rotation,
                flip_x: flipX,
                flip_y: flipY,
            });
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent
                data-block='PhotoCropDialog'
                // Overrides the Drawer's shared 80dvh mobile cap
                // (src/ui/drawer.jsx) — this dialog has no internal scroll,
                // so on short phones the default cap was clipping the
                // footer's Guardar button off-screen instead of just
                // shrinking it. No scroll area here on purpose (it fought
                // with the cropper's own pan/zoom touch gestures) — just
                // give it nearly the full screen instead.
                className='data-[vaul-drawer-direction=bottom]:max-h-[97dvh]'
            >
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Ajustar foto</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>

                <div className='flex flex-col gap-2 px-4 sm:px-0'>
                    <div
                        data-vaul-no-drag
                        className='relative mx-auto mt-4 aspect-square w-full max-w-64 overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10'
                    >
                        {/* Flip is applied as its own outer wrap around the
                            whole cropper viewport, not fed into it — react-
                            easy-crop has no native flip. Passing `rotation`
                            (not `onRotationChange`) lets it correctly account
                            for rotation in its own pan/zoom math while
                            keeping rotation *out* of gesture control — only
                            the 90°-step buttons below ever change it, so
                            pinch-rotate never puts it at an arbitrary angle
                            (see rotation column comment in db.sql). Order
                            here (flip wraps rotate+pan+zoom) has to match
                            getPhotoCropStyle/getPhotoFlipStyle's comment in
                            src/helpers/photo-crop.js exactly, or the saved
                            values would render differently here vs.
                            CroppedPhoto. */}
                        <div
                            className='absolute inset-0 scale-x-(--photo-flip-x) scale-y-(--photo-flip-y)'
                            style={getPhotoFlipStyle({ flip_x: flipX, flip_y: flipY })}
                        >
                            {src && (
                                <Cropper
                                    image={src}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
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

                    <div
                        className='mx-auto flex w-full max-w-64 items-center justify-center gap-2'
                        data-vaul-no-drag
                    >
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        onClick={rotateLeft}
                                    />
                                }
                            >
                                <ArrowCounterClockwiseIcon />
                                <span className='sr-only'>Rotar a la izquierda</span>
                            </TooltipTrigger>
                            <TooltipContent>Rotar a la izquierda</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        onClick={rotateRight}
                                    />
                                }
                            >
                                <ArrowClockwiseIcon />
                                <span className='sr-only'>Rotar a la derecha</span>
                            </TooltipTrigger>
                            <TooltipContent>Rotar a la derecha</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        onClick={() => setFlipX(current => !current)}
                                        className={cn(flipX && 'bg-accent text-accent-foreground')}
                                    />
                                }
                            >
                                <FlipHorizontalIcon />
                                <span className='sr-only'>Voltear horizontal</span>
                            </TooltipTrigger>
                            <TooltipContent>Voltear horizontal</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        onClick={() => setFlipY(current => !current)}
                                        className={cn(flipY && 'bg-accent text-accent-foreground')}
                                    />
                                }
                            >
                                <FlipVerticalIcon />
                                <span className='sr-only'>Voltear vertical</span>
                            </TooltipTrigger>
                            <TooltipContent>Voltear vertical</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <ResponsiveDialogFooter>
                    <Button type='button' variant='outline' onClick={handleReset}>
                        Restablecer
                    </Button>

                    <div className='hidden sm:block flex-1' />

                    <Button onClick={handleSave} disabled={isSaving || !cropSize}>
                        {isSaving && <Spinner data-icon='inline-start' />}
                        Guardar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
