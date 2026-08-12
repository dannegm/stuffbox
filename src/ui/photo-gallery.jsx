'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    BookmarkSimpleIcon,
    CameraIcon,
    FolderIcon,
    ImagesIcon,
    PencilSimpleIcon,
    UploadSimpleIcon,
    XIcon,
} from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';
import { Spinner } from '@/ui/spinner';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import { PhotoCropDialog } from '@/components/photos/photo-crop-dialog';
import { CroppedPhoto } from '@/ui/cropped-photo';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { photoUrl, PHOTO_SIZE } from '@/helpers/photos';

const ADD_TRIGGER_CLASS =
    'flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/60 hover:text-foreground';

// A pending (just-uploaded, not-yet-persisted) photo has no r2_key row yet to
// resolve through the proxy — its own local blob previewUrl wins instead.
const photoSrc = (photo, sizeId) => photo.previewUrl ?? photoUrl(photo.r2_key, sizeId);

// Same identity rule used for the React `key` below and for dnd-kit's
// draggable/droppable ids — a pending photo has no `.id` yet.
const getPhotoKey = photo => photo.id ?? photo.r2Key;

const moveItem = (list, fromIndex, toIndex) => {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

// useDraggable/useDroppable can't be called from inside PhotoGallery's
// `all.map(...)` (hooks can't run in a loop), hence its own component. The
// same node is both draggable (to pick this thumb up) and droppable (to be
// a drop target another thumb lands on, so dnd-kit's onDragOver can tell
// where the pointer is) — dnd-kit gives each its own ref callback, merged by
// hand since there's no built-in way to combine two.
// `touch-none` (touch-action: none) is required by dnd-kit's PointerSensor
// on touch devices — without it the browser's own scroll gesture wins the
// pointer before the drag sensor's activation distance is ever reached.
//
// `isGhost` is true for the one thumb currently being dragged — PhotoGallery
// already live-reorders the grid on every onDragOver, so this slot IS the
// insertion point, not the photo's old spot; it renders as an empty box with
// an inner shadow (the actual photo is what DragOverlay shows floating under
// the pointer) so the gap the other thumbs shifted open around reads as
// "drop here," not as a second copy of the photo sitting mid-shuffle.
//
// `layout` (motion.div, not a plain div) is what animates that shift — the
// grid is a normal flex-wrap of independently-positioned boxes, so
// reordering the array alone would make every other thumb instantly snap to
// its new slot; `layout` diffs each box's position across renders (FLIP
// under the hood) and tweens it instead.
const PhotoThumb = ({ photo, photoKey, isCover, isGhost, isWiggling, onView, onEdit, onRemove }) => {
    const { attributes, listeners, setNodeRef: setDraggableRef } = useDraggable({
        id: photoKey,
    });
    const { setNodeRef: setDroppableRef } = useDroppable({ id: photoKey });
    const setRefs = node => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    if (isGhost) {
        return (
            <motion.div
                layout
                transition={{ duration: 0.2, ease: 'easeOut' }}
                ref={setRefs}
                {...listeners}
                {...attributes}
                className='size-24 shrink-0 touch-none rounded-lg bg-primary/5 shadow-inner shadow-primary/30'
            />
        );
    }

    return (
        <motion.div
            layout
            transition={{ duration: 0.2, ease: 'easeOut' }}
            ref={setRefs}
            {...listeners}
            {...attributes}
            className={cn(
                'group relative size-24 shrink-0 touch-none overflow-hidden rounded-lg border bg-muted shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10',
                isWiggling && 'animate-photo-duplicate-wiggle',
            )}
        >
            {isCover && (
                <span className='absolute top-1.5 left-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 text-primary shadow-xs shadow-black/20 ring-1 ring-foreground/10 [&_svg]:size-3.5'>
                    <BookmarkSimpleIcon weight='fill' />
                    <span className='sr-only'>Foto de portada</span>
                </span>
            )}

            <button
                type='button'
                aria-label='Ver foto'
                onClick={onView}
                className='relative block size-full overflow-hidden'
            >
                <CroppedPhoto src={photoSrc(photo, PHOTO_SIZE.CARD)} photo={photo} />
            </button>

            <button
                type='button'
                aria-label='Editar foto'
                onClick={event => {
                    event.stopPropagation();
                    onEdit();
                }}
                className='absolute bottom-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-xs shadow-black/20 ring-1 ring-foreground/10 transition-opacity group-hover:opacity-100 touch:opacity-100 [&_svg]:size-3.5'
            >
                <PencilSimpleIcon />
            </button>
            <button
                type='button'
                aria-label='Quitar foto'
                onClick={event => {
                    event.stopPropagation();
                    onRemove();
                }}
                className='absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-xs shadow-black/20 ring-1 ring-foreground/10 transition-opacity group-hover:opacity-100 touch:opacity-100 [&_svg]:size-3.5'
            >
                <XIcon />
            </button>
        </motion.div>
    );
};

// Shared by item and location photo galleries — `pending` (uploaded but not
// yet persisted to a row) only applies to the item flow, where photos can be
// added before the item itself exists; pass an empty array otherwise.
// `onUpdateCrop(photo, { crop_x, crop_y, zoom })` backs the "Editar" button
// on both the thumb here and inside PhotoLightbox — one PhotoCropDialog
// instance serves both entry points. `onReorder(newOrderedAll)` fires with
// the full reordered array after a drag — callers (useItemPhotos/
// useLocationPhotos) turn that back into `order` values per row.
export const PhotoGallery = ({
    photos = [],
    pending = [],
    isProcessing,
    onAddFiles,
    onRemove,
    onUpdateCrop,
    onReorder,
}) => {
    const all = [...photos, ...pending];
    const [openIndex, setOpenIndex] = useState(null);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [wigglingKeys, setWigglingKeys] = useState([]);
    const [activeId, setActiveId] = useState(null);
    // Live-reordered preview of `all` while a drag is in progress — null
    // outside of a drag, so the grid otherwise just tracks `all` directly.
    // Updated on every onDragOver (not only on drop) so the other thumbs
    // visibly shift to open a gap at the pointer's current target, instead
    // of only a static "this is the swap target" highlight.
    const [dragOrder, setDragOrder] = useState(null);
    const isMobile = useIsMobile();
    const $cameraInput = useRef(null);
    const $galleryInput = useRef(null);
    const $filesInput = useRef(null);
    const dragCounter = useRef(0);
    // Same activation constraint as the item/location drag-to-move DnD
    // (location/[id]/page.js) — a small movement threshold before the
    // gesture engages, so a plain tap still opens the lightbox instead of
    // always arming a drag.
    const reorderSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const displayList = dragOrder ?? all;
    const activePhoto = activeId ? all.find(photo => getPhotoKey(photo) === activeId) : null;

    const handleReorderDragStart = ({ active }) => {
        setActiveId(active.id);
        setDragOrder(all);
    };

    const handleReorderDragOver = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setDragOrder(current => {
            const list = current ?? all;
            const fromIndex = list.findIndex(photo => getPhotoKey(photo) === active.id);
            const toIndex = list.findIndex(photo => getPhotoKey(photo) === over.id);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return list;
            return moveItem(list, fromIndex, toIndex);
        });
    };

    const handleReorderDragEnd = () => {
        setActiveId(null);
        // dragOrder already reflects the final target position — every
        // onDragOver up to (and including) the one that landed here already
        // applied it, so there's nothing left to compute at drop time.
        if (dragOrder && onReorder) {
            const changed = dragOrder.some(
                (photo, index) => getPhotoKey(photo) !== getPhotoKey(all[index]),
            );
            if (changed) onReorder(dragOrder);
        }
        setDragOrder(null);
    };

    const handleReorderDragCancel = () => {
        setActiveId(null);
        setDragOrder(null);
    };

    // Shared by the click-to-pick inputs and the drop zone below — flags any
    // file that matches one already uploaded this session (see
    // useItemPhotos/useLocationPhotos) so its existing thumbnail can wiggle
    // instead of silently re-uploading a copy.
    const processFiles = async fileList => {
        const result = await onAddFiles(fileList);
        const duplicates = result?.duplicates ?? [];
        if (duplicates.length === 0) return;

        setWigglingKeys(current => [...new Set([...current, ...duplicates])]);
        setTimeout(() => {
            setWigglingKeys(current => current.filter(key => !duplicates.includes(key)));
        }, 400);
    };

    const handleFiles = event => {
        processFiles(event.target.files);
        event.target.value = '';
        // The mobile "Agregar" trigger lives inside a modal Drawer
        // (ResponsiveDropdownMenu), which can lock document.body's pointer
        // events while open. Opening the native camera/gallery sheet
        // backgrounds the page on iOS, which can interrupt that lock's own
        // cleanup — leaving the whole page unclickable ("nothing responds,
        // like something is on top of it") once the native picker returns.
        // Force the lock off here, the exact point control comes back.
        document.body.style.pointerEvents = '';
    };

    const handleDragEnter = event => {
        event.preventDefault();
        if (!Array.from(event.dataTransfer.types || []).includes('Files')) return;
        dragCounter.current += 1;
        setIsDraggingOver(true);
    };

    const handleDragOver = event => {
        event.preventDefault();
    };

    const handleDragLeave = event => {
        event.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) setIsDraggingOver(false);
    };

    const handleDrop = event => {
        event.preventDefault();
        dragCounter.current = 0;
        setIsDraggingOver(false);
        processFiles(event.dataTransfer.files);
    };

    return (
        <div
            className={cn('relative flex flex-wrap gap-3 rounded-lg transition-colors', {
                'outline-2 outline-dashed outline-primary/60 outline-offset-4 bg-primary/5':
                    isDraggingOver,
            })}
            data-block='PhotoGallery'
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDraggingOver && (
                <div className='pointer-events-none absolute -inset-2 z-10 flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-primary'>
                    <UploadSimpleIcon className='size-4' />
                    Suelta las fotos aquí
                </div>
            )}

            <DndContext
                sensors={reorderSensors}
                collisionDetection={closestCenter}
                onDragStart={handleReorderDragStart}
                onDragOver={handleReorderDragOver}
                onDragEnd={handleReorderDragEnd}
                onDragCancel={handleReorderDragCancel}
            >
                {displayList.map((photo, index) => (
                    <PhotoThumb
                        key={getPhotoKey(photo)}
                        photoKey={getPhotoKey(photo)}
                        photo={photo}
                        isCover={index === 0}
                        isGhost={activeId === getPhotoKey(photo)}
                        isWiggling={wigglingKeys.includes(photo.r2Key ?? photo.r2_key)}
                        onView={() => setOpenIndex(index)}
                        onEdit={() => setEditingPhoto(photo)}
                        onRemove={() => onRemove(photo)}
                    />
                ))}
                {/* Sized to 2/3 of the real size-24 thumb (size-16 = 4rem)
                    and 'relative' (not just sized) — CroppedPhoto positions
                    itself `absolute inset-0`, so without a positioned
                    ancestor of its own it was escaping this box entirely,
                    losing the square crop and covering whatever sat behind
                    the cursor. */}
                <DragOverlay>
                    {activePhoto && (
                        <div className='relative size-16 overflow-hidden rounded-lg border shadow-lg'>
                            <CroppedPhoto
                                src={photoSrc(activePhoto, PHOTO_SIZE.CARD)}
                                photo={activePhoto}
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {isMobile ? (
                // Explicit either/or on every mobile browser (not just
                // Android — behavior is inconsistent enough across mobile
                // browsers/OSes that picking one deterministic path beats
                // guessing per-platform) — its own capture=environment input
                // forces the camera open, the other is the same gallery
                // input desktop uses directly.
                <ResponsiveDropdownMenu>
                    <ResponsiveDropdownMenuTrigger
                        render={
                            <button
                                type='button'
                                disabled={isProcessing}
                                className={cn(
                                    ADD_TRIGGER_CLASS,
                                    isProcessing && 'pointer-events-none opacity-60',
                                )}
                            />
                        }
                    >
                        {isProcessing ? (
                            <Spinner className='size-4' />
                        ) : (
                            <CameraIcon className='size-5' />
                        )}
                        <span className='text-xs'>Agregar</span>
                    </ResponsiveDropdownMenuTrigger>
                    <ResponsiveDropdownMenuContent align='start'>
                        <ResponsiveDropdownMenuItem onClick={() => $cameraInput.current?.click()}>
                            <CameraIcon />
                            Tomar foto
                        </ResponsiveDropdownMenuItem>
                        <ResponsiveDropdownMenuItem onClick={() => $galleryInput.current?.click()}>
                            <ImagesIcon />
                            Elegir de la galería
                        </ResponsiveDropdownMenuItem>
                        <ResponsiveDropdownMenuItem onClick={() => $filesInput.current?.click()}>
                            <FolderIcon />
                            Seleccionar archivos
                        </ResponsiveDropdownMenuItem>
                    </ResponsiveDropdownMenuContent>
                </ResponsiveDropdownMenu>
            ) : (
                <label
                    className={cn(ADD_TRIGGER_CLASS, 'cursor-pointer', {
                        'pointer-events-none opacity-60': isProcessing,
                    })}
                >
                    {isProcessing ? (
                        <Spinner className='size-4' />
                    ) : (
                        <CameraIcon className='size-5' />
                    )}
                    <span className='text-xs'>Agregar</span>
                    <input
                        type='file'
                        accept='image/*'
                        multiple
                        className='sr-only'
                        onChange={handleFiles}
                    />
                </label>
            )}

            {isMobile && (
                <>
                    {/* Kept outside the menu, in PhotoGallery's own scope, so
                    closing the drawer never unmounts these mid-pick. */}
                    <input
                        ref={$cameraInput}
                        type='file'
                        accept='image/*'
                        capture='environment'
                        className='sr-only'
                        onChange={handleFiles}
                    />
                    <input
                        ref={$galleryInput}
                        type='file'
                        accept='image/*'
                        multiple
                        className='sr-only'
                        onChange={handleFiles}
                    />
                    {/* Extension list instead of the `image/*` MIME wildcard
                    on purpose — that's what steers iOS/Android to the plain
                    Files browser instead of routing to the Photos picker. */}
                    <input
                        ref={$filesInput}
                        type='file'
                        accept='.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tiff'
                        multiple
                        className='sr-only'
                        onChange={handleFiles}
                    />
                </>
            )}

            <PhotoLightbox
                photos={all.map(photo => ({
                    src: photoSrc(photo, PHOTO_SIZE.LIGHTBOX),
                    photo,
                }))}
                index={openIndex}
                onIndexChange={setOpenIndex}
                onClose={() => setOpenIndex(null)}
                onEditPhoto={setEditingPhoto}
            />

            <PhotoCropDialog
                open={!!editingPhoto}
                photo={editingPhoto}
                src={editingPhoto ? photoSrc(editingPhoto, PHOTO_SIZE.LIGHTBOX) : null}
                onOpenChange={open => !open && setEditingPhoto(null)}
                onSave={cropValues => onUpdateCrop(editingPhoto, cropValues)}
            />
        </div>
    );
};
