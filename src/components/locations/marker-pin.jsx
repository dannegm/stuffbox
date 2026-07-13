import { cn } from '@/helpers/utils';

// Adapted from pinia's PinGlyph (src/components/map/pin-glyph.jsx) — a
// classic "drop pin": colored head with a highlight dot, a short stem, a
// radar pulse, and a shadow dot at the anchor point. `lifted` animates it up
// while being dragged (see LocationMapPicker's onDragStart/onDragEnd).
// Semantic tokens throughout instead of pinia's hardcoded rose/gray, so it
// (and the pulse ring) adapt automatically in dark mode.
export const MarkerPin = ({ lifted, color = 'bg-primary', pulse = true }) => (
    <div className='relative flex flex-col items-center'>
        <div
            className={cn(
                'z-10 flex flex-col items-center transition-transform duration-150 ease-out',
                lifted && '-translate-y-3',
            )}
        >
            <div className={cn('relative size-5 rounded-full', color)}>
                <div className='absolute top-1 right-1 size-1.5 rounded-full bg-white' />
            </div>
            <div className='h-3 w-1 rounded-b-md bg-muted-foreground/40' />
        </div>
        {pulse && (
            <div className='absolute bottom-0 size-16 translate-y-1/2 animate-radar-ping rounded-full border-2 border-primary bg-primary/10' />
        )}
        <div className='absolute bottom-0 size-2 translate-y-1/2 rounded-full bg-foreground/40' />
    </div>
);
