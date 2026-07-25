'use client';

import { useState } from 'react';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import { pickBySeed } from '@/helpers/seed';
import { cn } from '@/helpers/utils';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const photoUrl = photo => `${R2_PUBLIC_URL}/${photo.r2_key}`;

// CroppedPhoto's pan/zoom (crop_x/crop_y/zoom) is captured against a *square*
// crop tool (src/helpers/photo-crop.js) and only computes correctly against a
// square box. This stage establishes one — sized to max(cellWidth,
// cellHeight) via the same min-width/min-height "cover" trick CroppedPhoto's
// own <img> uses, centered — so the pan/zoom still resolves correctly even
// inside a non-square cell (the 2-photo split, the "big" cell in the
// 3-photo layout); the cell's own overflow-hidden then clips the square
// stage down to the cell's real, possibly-rectangular shape. For an
// already-square cell this resolves to the same size as before, so nothing
// changes there.
const SquareCoverStage = ({ children }) => (
    <div className='absolute top-1/2 left-1/2 aspect-square h-auto min-h-full w-auto min-w-full -translate-x-1/2 -translate-y-1/2'>
        {children}
    </div>
);

const Cell = ({ photo, index, className, onOpen }) => (
    <button
        type='button'
        aria-label='Ver foto'
        // Same trick as the edit link in DeckEntityCard: the whole card sits
        // inside DeckCards' drag="x" gesture, so a plain tap here would
        // otherwise also arm/start that drag instead of producing a clean
        // click.
        onPointerDown={event => event.stopPropagation()}
        onClick={event => {
            event.stopPropagation();
            onOpen(index);
        }}
        className={cn('relative block size-full overflow-hidden', className)}
    >
        <SquareCoverStage>
            <CroppedPhoto src={photoUrl(photo)} photo={photo} />
        </SquareCoverStage>
    </button>
);

// 0/1/2/3/4+ photos, always rendered into a square parent (aspect-square is
// set by the caller) — 2 photos split vertical/horizontal, 3 photos use a
// "big + 2 stacked" grid (which side is big, whether the stacked pair runs
// side by side or on top of each other). The choice is seeded by the entity
// (not Math.random()/useMemo) because DeckCards keys its cards by stack
// position, not identity — a card moving from the back of the stack to the
// front gets a fresh component instance, which would re-roll a random pick
// on every reshuffle instead of keeping one layout per entity.
const PhotoGrid = ({ sorted, twoPhotoOrientation, threePhotoLayout, onOpen }) => {
    if (sorted.length === 1) {
        return <Cell photo={sorted[0]} index={0} className='size-full' onOpen={onOpen} />;
    }

    if (sorted.length === 2) {
        return (
            <div
                className={cn(
                    'grid size-full gap-1',
                    twoPhotoOrientation === 'horizontal' ? 'grid-cols-2' : 'grid-rows-2',
                )}
            >
                {sorted.map((photo, index) => (
                    <Cell key={photo.r2_key} photo={photo} index={index} onOpen={onOpen} />
                ))}
            </div>
        );
    }

    if (sorted.length === 3) {
        const [big, ...rest] = sorted;
        const isSideBySide = threePhotoLayout === 'left' || threePhotoLayout === 'right';
        const bigFirst = threePhotoLayout === 'left' || threePhotoLayout === 'top';
        return (
            <div className={cn('grid size-full gap-1', isSideBySide ? 'grid-cols-2' : 'grid-rows-2')}>
                <Cell
                    photo={big}
                    index={0}
                    className={bigFirst ? 'order-1' : 'order-2'}
                    onOpen={onOpen}
                />
                <div
                    className={cn(
                        'grid size-full gap-1',
                        isSideBySide ? 'grid-rows-2' : 'grid-cols-2',
                        bigFirst ? 'order-2' : 'order-1',
                    )}
                >
                    {rest.map((photo, index) => (
                        <Cell key={photo.r2_key} photo={photo} index={index + 1} onOpen={onOpen} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className='grid size-full grid-cols-2 grid-rows-2 gap-1'>
            {sorted.slice(0, 4).map((photo, index) => (
                <Cell key={photo.r2_key} photo={photo} index={index} onOpen={onOpen} />
            ))}
        </div>
    );
};

export const DeckCardPhotos = ({ photos, icon, seed }) => {
    const sorted = [...(photos ?? [])].sort((a, b) => a.order - b.order);
    const twoPhotoOrientation = pickBySeed(`${seed}:2`, ['horizontal', 'vertical']);
    const threePhotoLayout = pickBySeed(`${seed}:3`, ['left', 'right', 'top', 'bottom']);
    const [openIndex, setOpenIndex] = useState(null);

    if (sorted.length === 0) {
        return (
            <div className='flex size-full items-center justify-center bg-muted text-muted-foreground [&_svg]:size-15'>
                <DynamicIcon icon={icon} />
            </div>
        );
    }

    return (
        <>
            <PhotoGrid
                sorted={sorted}
                twoPhotoOrientation={twoPhotoOrientation}
                threePhotoLayout={threePhotoLayout}
                onOpen={setOpenIndex}
            />
            <PhotoLightbox
                photos={sorted.map(photo => ({ src: photoUrl(photo), photo }))}
                index={openIndex}
                onIndexChange={setOpenIndex}
                onClose={() => setOpenIndex(null)}
            />
        </>
    );
};
