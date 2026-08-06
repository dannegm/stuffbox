import Link from 'next/link';
import { PackageIcon } from 'lucide-react';
import { cn } from '@/helpers/utils';

// Packing-tape shorthand (`bg-strip-*`, src/css/utilities.css) for "packed
// into a move", now keyed to the `--flourish` brand token so light/dark swap
// for free. `PackedTape` is the diagonal strip used down a list row's left
// edge (row content needs its own `z-1` to sit above it); `PackedTapeTop` is
// the band for the item/location detail pages' header, topped by a `MoveTag`
// — a little printed tag hanging off the tape, same dashed-border "printed
// label" language as IdentityTag (src/components/auth/identity-tag.jsx),
// clipped on with a punched hole and given a one-shot `animate-tag-swing`
// settle. Both bands sit behind via `z-0` and need their wrapper to be
// `relative overflow-hidden` (PackedTapeTop's parent should also allow the
// tag to overflow — it deliberately pokes out past the band).
export const PackedTape = ({ className }) => (
    <span
        aria-hidden
        className={cn(
            'absolute z-0 inset-y-0 left-0 w-8 border-r border-black/10 bg-strip-flourish shadow-sm shadow-black/20 dark:border-white/10',
            className,
        )}
    />
);

// Card-grid counterpart to `PackedTape` — a cover photo fills the icon
// square edge-to-edge (z-1, above the tape's z-0), which hid the left-edge
// strip entirely whenever a card had a photo. This one lives on the card's
// own outer container instead of inside that square, so it's never behind
// the photo layer — a short flag clipped by the card's own rounded corner
// rather than a strip running the square's full height.
export const PackedTapeCard = ({ className }) => (
    <span
        aria-hidden
        className={cn(
            'absolute top-0 left-0 z-20 h-2 w-16 border-r border-b border-black/10 bg-strip-flourish shadow-sm shadow-black/20 dark:border-white/10',
            className,
        )}
    />
);

export const PackedTapeTop = ({ className, moveId, moveName }) => (
    <div className={cn('absolute inset-x-0 top-0 z-0', className)}>
        <span
            aria-hidden
            className='block h-2 border-b border-black/10 bg-strip-flourish shadow-sm shadow-black/20 dark:border-white/10'
        />
        {moveId && moveName && <MoveTag moveId={moveId} moveName={moveName} />}
    </div>
);

// The tag itself is a real link to the move — not just decoration.
export const MoveTag = ({ moveId, moveName }) => (
    <Link
        href={`/move/${moveId}`}
        aria-label={`Empacado en la mudanza: ${moveName}`}
        data-block='MoveTag'
        className={cn(
            'group/tag absolute -top-2.5 sm:top-1 right-3 z-10 -rotate-3 animate-tag-swing',
            'flex items-center gap-1.5 rounded-md border border-dashed border-flourish/50',
            'bg-card py-1 pr-2.5 pl-1.5 text-xs font-medium text-foreground',
            'shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:rotate-0',
        )}
    >
        <span className='flex size-2.5 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-foreground/15 group-hover/tag:ring-flourish/40' />
        <PackageIcon weight='bold' className='size-3.5 shrink-0 text-flourish' />
        <span className='max-w-28 truncate'>{moveName}</span>
    </Link>
);
