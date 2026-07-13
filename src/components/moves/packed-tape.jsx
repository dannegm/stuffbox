import { cn } from '@/helpers/utils';

// Packing-tape shorthand (`bg-strip-*`, src/css/utilities.css) for "packed
// into a move". `PackedTape` is the diagonal strip used down a list row's
// left edge (row content needs its own `z-1` to sit above it); `PackedTapeTop`
// is a thin band for the item/location detail pages' header. Both sit behind
// via `z-0` and need their wrapper to be `relative overflow-hidden` to clip
// to its corners.
export const PackedTape = ({ className }) => (
    <span
        aria-hidden
        className={cn(
            'absolute z-0 inset-y-0 left-0 w-8 bg-strip-amber-200 dark:bg-strip-amber-600',
            className,
        )}
    />
);

export const PackedTapeTop = ({ className }) => (
    <span
        aria-hidden
        className={cn(
            'absolute inset-x-0 top-0 z-0 h-1 bg-strip-amber-200 dark:bg-strip-amber-600',
            className,
        )}
    />
);
