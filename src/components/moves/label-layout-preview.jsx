'use client';

import { buildLabelGrid, LETTER_WIDTH_MM, LETTER_HEIGHT_MM } from '@/helpers/label-layout';
import { cn } from '@/helpers/utils';

// Scale target for the sheet's width — everything else (height, margins,
// gaps, box size) derives from this so the CSS preview always matches
// LabelDocument's real mm math (see buildLabelGrid), just scaled down.
const PREVIEW_WIDTH_PX = 200;

// Live, CSS-only stand-in for the real PDF grid — same math as LabelDocument
// (buildLabelGrid), rendered as plain flex boxes instead of react-pdf so it
// updates instantly as the settings form's inputs change, no PDF re-render.
export const LabelLayoutPreview = ({
    boxWidthMm,
    boxHeightMm,
    marginVerticalMm,
    marginHorizontalMm,
    tagsPerPage,
    className,
}) => {
    const scale = PREVIEW_WIDTH_PX / LETTER_WIDTH_MM;
    const { columnGapMm, rowGapMm } = buildLabelGrid({
        boxWidthMm,
        boxHeightMm,
        marginVerticalMm,
        marginHorizontalMm,
        tagsPerPage,
    });

    return (
        <div
            className={cn(
                'flex h-(--sheet-h) w-(--sheet-w) flex-row flex-wrap content-start bg-white py-(--margin-v) px-(--margin-h) gap-x-(--gap-x) gap-y-(--gap-y) shadow-xs ring-1 ring-foreground/10',
                className,
            )}
            style={{
                '--sheet-w': `${LETTER_WIDTH_MM * scale}px`,
                '--sheet-h': `${LETTER_HEIGHT_MM * scale}px`,
                '--margin-v': `${marginVerticalMm * scale}px`,
                '--margin-h': `${marginHorizontalMm * scale}px`,
                '--gap-x': `${columnGapMm * scale}px`,
                '--gap-y': `${rowGapMm * scale}px`,
                '--box-w': `${boxWidthMm * scale}px`,
                '--box-h': `${boxHeightMm * scale}px`,
            }}
            data-block='LabelLayoutPreview'
        >
            {Array.from({ length: tagsPerPage }, (_, index) => (
                <div key={index} className='h-(--box-h) w-(--box-w) border border-dashed border-black/30' />
            ))}
        </div>
    );
};
