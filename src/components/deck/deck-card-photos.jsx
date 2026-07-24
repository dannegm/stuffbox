'use client';

import { CroppedPhoto } from '@/ui/cropped-photo';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { pickBySeed } from '@/helpers/seed';
import { cn } from '@/helpers/utils';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
const photoUrl = photo => `${R2_PUBLIC_URL}/${photo.r2_key}`;

const Cell = ({ photo, className }) => (
    <div className={cn('relative overflow-hidden', className)}>
        <CroppedPhoto src={photoUrl(photo)} photo={photo} />
    </div>
);

// 0/1/2/3/4+ photos, always rendered into a square parent (aspect-square is
// set by the caller) — 2 photos split vertical/horizontal, 3 photos use a
// "big + 2 stacked" grid (which side is big, whether the stacked pair runs
// side by side or on top of each other). The choice is seeded by the entity
// (not Math.random()/useMemo) because DeckCards keys its cards by stack
// position, not identity — a card moving from the back of the stack to the
// front gets a fresh component instance, which would re-roll a random pick
// on every reshuffle instead of keeping one layout per entity.
export const DeckCardPhotos = ({ photos, icon, seed }) => {
    const sorted = [...(photos ?? [])].sort((a, b) => a.order - b.order);
    const twoPhotoOrientation = pickBySeed(`${seed}:2`, ['horizontal', 'vertical']);
    const threePhotoLayout = pickBySeed(`${seed}:3`, ['left', 'right', 'top', 'bottom']);

    if (sorted.length === 0) {
        return (
            <div className='flex size-full items-center justify-center bg-muted text-muted-foreground [&_svg]:size-15'>
                <DynamicIcon icon={icon} />
            </div>
        );
    }

    if (sorted.length === 1) {
        return <Cell photo={sorted[0]} className='size-full' />;
    }

    if (sorted.length === 2) {
        return (
            <div
                className={cn(
                    'grid size-full gap-1',
                    twoPhotoOrientation === 'horizontal' ? 'grid-cols-2' : 'grid-rows-2',
                )}
            >
                {sorted.map(photo => (
                    <Cell key={photo.r2_key} photo={photo} />
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
                <Cell photo={big} className={bigFirst ? 'order-1' : 'order-2'} />
                <div
                    className={cn(
                        'grid gap-1',
                        isSideBySide ? 'grid-rows-2' : 'grid-cols-2',
                        bigFirst ? 'order-2' : 'order-1',
                    )}
                >
                    {rest.map(photo => (
                        <Cell key={photo.r2_key} photo={photo} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className='grid size-full grid-cols-2 grid-rows-2 gap-1'>
            {sorted.slice(0, 4).map(photo => (
                <Cell key={photo.r2_key} photo={photo} />
            ))}
        </div>
    );
};
