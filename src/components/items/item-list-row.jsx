import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PackedTape } from '@/components/moves/packed-tape';
import { getItemIcon, getItemPhotoUrl, getFirstItemPhoto } from '@/helpers/item';
import { cn } from '@/helpers/utils';

// `selectable` swaps the row from a navigating Link to a toggle button —
// tapping anywhere in the row selects it instead of opening the item, same
// as bulk-select on mobile file pickers. `draggable`/`dragData` are for the
// desktop-only split view's drag-to-transfer (dnd-kit, wrapped in a
// <DndContext> by the page; never set on mobile) — an item row is only ever
// a drag source, never a drop target.
export const ItemListRow = ({
    item,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
}) => {
    const photoUrl = getItemPhotoUrl(item);
    const photo = getFirstItemPhoto(item);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: dragData,
        disabled: !draggable,
    });
    const dragProps = draggable ? { ...attributes, ...listeners } : {};

    const className = cn(
        'relative flex w-full overflow-hidden items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted',
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
                <span className='z-1' onClick={event => event.stopPropagation()}>
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
            <span className='min-w-0 flex-1 truncate font-medium'>{item.name}</span>
            {item.quantity > 1 && (
                <span className='shrink-0 text-xs text-muted-foreground'>×{item.quantity}</span>
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
