import Link from 'next/link';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CaretRightIcon, PackageIcon, LeafIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PackedTape } from '@/components/moves/packed-tape';
import { getLocationIcon, getLocationPhotoUrl, getFirstLocationPhoto } from '@/helpers/location';
import { PHOTO_SIZE } from '@/helpers/photos';
import { cn } from '@/helpers/utils';

// `counts` = { locations, items } — direct/root-level only, not recursive.
// Omitted entirely when both are 0 rather than showing "0 location(s)".
// `selectable` swaps the row from a navigating Link to a toggle button, same
// as ItemListRow. `draggable`/`dragData` and `droppable` are for the
// desktop-only split view (dnd-kit, wrapped in a <DndContext> by the page) —
// a location row is both a drag source (move it into another location) and a
// drop target (items or other locations dropped onto it transfer here); the
// two dnd-kit hooks are independent, so either can be opted into alone.
export const LocationListItem = ({
    location,
    counts,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
    droppable = false,
}) => {
    const photoUrl = getLocationPhotoUrl(location, PHOTO_SIZE.LIST);
    const photo = getFirstLocationPhoto(location);

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({
        id: location.id,
        data: dragData,
        disabled: !draggable,
    });
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: location.id,
        disabled: !droppable,
    });
    const setRefs = node => {
        setDragRef(node);
        setDropRef(node);
    };
    const dragProps = draggable ? { ...attributes, ...listeners } : {};

    const className = cn(
        'relative flex w-full shrink-0 overflow-hidden items-center gap-3 rounded-lg border bg-card p-3 text-left text-sm shadow-xs ring-1 ring-foreground/5 transition-colors hover:bg-muted',
        selected && 'border-primary bg-primary/5',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isOver && 'border-primary bg-primary/10 ring-2 ring-primary/40',
    );

    const content = (
        <>
            {location.active_move_id && (
                <PackedTape
                    className={cn({
                        'opacity-50 w-14.5': selectable,
                    })}
                />
            )}
            {selectable && (
                // Same fix as ItemListRow — stop the click from bubbling to the
                // row's own button, which shares this exact toggle handler.
                <span
                    className='z-1 cursor-default'
                    onClick={event => event.stopPropagation()}
                >
                    <Checkbox checked={selected} onCheckedChange={() => onToggle(location.id)} />
                </span>
            )}
            <span className='relative z-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                {photoUrl ? (
                    <CroppedPhoto src={photoUrl} photo={photo} />
                ) : (
                    <DynamicIcon icon={getLocationIcon(location)} />
                )}
            </span>
            <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{location.name}</span>
                <span className='block truncate text-xs text-muted-foreground capitalize'>
                    {location.type}
                </span>
            </span>
            {(counts?.locations > 0 || counts?.items > 0) && (
                <span className='z-1 flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground'>
                    {counts.locations > 0 && (
                        <span className='flex items-center gap-1'>
                            <PackageIcon className='size-3.5' />
                            {counts.locations}
                        </span>
                    )}
                    {counts.items > 0 && (
                        <span className='flex items-center gap-1'>
                            <LeafIcon className='size-3.5' />
                            {counts.items}
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
                ref={setRefs}
                type='button'
                data-block='LocationListItem'
                className={className}
                onClick={() => onToggle(location.id)}
                {...dragProps}
            >
                {content}
            </button>
        );
    }

    return (
        <Link
            ref={setRefs}
            href={`/location/${location.id}`}
            data-block='LocationListItem'
            className={className}
            {...dragProps}
        >
            {content}
        </Link>
    );
};
