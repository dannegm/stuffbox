import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { CaretRightIcon, ThumbsUpIcon, ThumbsDownIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { MarqueeText } from '@/ui/marquee-text';
import { PackedTape } from '@/components/moves/packed-tape';
import { getItemIcon, getItemPhotoUrl, getFirstItemPhoto } from '@/helpers/item';
import { PHOTO_SIZE } from '@/helpers/photos';
import { cn } from '@/helpers/utils';

// `selectable` swaps the row from a navigating Link to a toggle button —
// tapping anywhere in the row selects it instead of opening the item, same
// as bulk-select on mobile file pickers. `draggable`/`dragData` are for the
// desktop-only split view's drag-to-transfer (dnd-kit, wrapped in a
// <DndContext> by the page; never set on mobile) — an item row is only ever
// a drag source, never a drop target. `ancestorPath`/`parentLocationId`
// (search results only, src/queries/search.js) render a second "where is
// this" line linking to the direct containing location — the row itself
// stays a real anchor to the item, so this needs a stretched sibling link
// (not a nested one, invalid HTML) with the path link stacked above it.
export const ItemListRow = ({
    item,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
    likeCount = 0,
    dislikeCount = 0,
    ancestorPath = [],
    parentLocationId,
}) => {
    const photoUrl = getItemPhotoUrl(item, PHOTO_SIZE.LIST);
    const photo = getFirstItemPhoto(item);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: dragData,
        disabled: !draggable,
    });
    const dragProps = draggable ? { ...attributes, ...listeners } : {};
    const showPath = !selectable && ancestorPath.length > 0 && !!parentLocationId;

    const className = cn(
        'relative flex w-full shrink-0 overflow-hidden items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted',
        selected && 'border-primary bg-primary/5',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
    );

    const content = (
        <>
            {item.active_move_id && (
                <PackedTape
                    className={cn({
                        'opacity-50 w-14.5': selectable,
                    })}
                />
            )}
            {selectable && (
                // The row itself is a button with the same onToggle click handler —
                // without stopping propagation, clicking the checkbox bubbles up and
                // fires both, toggling twice (i.e. visually doing nothing).
                <span
                    className='z-1 cursor-default'
                    onClick={event => event.stopPropagation()}
                >
                    <Checkbox checked={selected} onCheckedChange={() => onToggle(item.id)} />
                </span>
            )}
            <span className='relative z-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                {photoUrl ? (
                    <CroppedPhoto src={photoUrl} photo={photo} />
                ) : (
                    <DynamicIcon icon={getItemIcon(item)} />
                )}
            </span>
            <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{item.name}</span>
                {showPath && (
                    <Link
                        href={`/location/${parentLocationId}`}
                        className='relative z-20 block w-fit max-w-full text-xs text-muted-foreground hover:text-foreground hover:underline'
                    >
                        <MarqueeText>
                            {ancestorPath.map((name, index) => (
                                <span key={index} className='inline-flex items-center align-middle'>
                                    {index > 0 && (
                                        <CaretRightIcon className='mx-1 size-3 shrink-0 text-muted-foreground/50' />
                                    )}
                                    {name}
                                </span>
                            ))}
                        </MarqueeText>
                    </Link>
                )}
            </span>
            {item.quantity > 1 && (
                <span className='shrink-0 text-xs text-muted-foreground'>×{item.quantity}</span>
            )}
            {(likeCount > 0 || dislikeCount > 0) && (
                <span className='flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground'>
                    {likeCount > 0 && (
                        <span className='flex items-center gap-0.5 text-emerald-600 [&_svg]:size-3'>
                            <ThumbsUpIcon weight='fill' />
                            {likeCount}
                        </span>
                    )}
                    {dislikeCount > 0 && (
                        <span className='flex items-center gap-0.5 text-rose-600 [&_svg]:size-3'>
                            <ThumbsDownIcon weight='fill' />
                            {dislikeCount}
                        </span>
                    )}
                </span>
            )}
            {!selectable && <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />}
        </>
    );

    if (selectable) {
        return (
            <button
                ref={setNodeRef}
                type='button'
                data-block='ItemListRow'
                className={className}
                onClick={() => onToggle(item.id)}
                {...dragProps}
            >
                {content}
            </button>
        );
    }

    if (showPath) {
        // Two sibling anchors, not a nested one (invalid HTML/hydration
        // error) — this one is stretched over the whole row as the default
        // target, and the path link above stacks on a higher z so it wins
        // hit-testing over its own area (see the component doc comment).
        return (
            <div ref={setNodeRef} data-block='ItemListRow' className={className} {...dragProps}>
                <Link
                    href={`/item/${item.id}`}
                    aria-label={item.name}
                    className='absolute inset-0 z-10'
                />
                {content}
            </div>
        );
    }

    return (
        <Link
            ref={setNodeRef}
            href={`/item/${item.id}`}
            data-block='ItemListRow'
            className={className}
            {...dragProps}
        >
            {content}
        </Link>
    );
};
