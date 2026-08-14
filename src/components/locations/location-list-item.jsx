import Link from 'next/link';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CaretRightIcon, PackageIcon, LeafIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { MarqueeText } from '@/ui/marquee-text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
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
// `ancestorPath`/`parentLocationId` (search results only, src/queries/
// search.js) render a second "where is this" line linking to the direct
// parent location — see ItemListRow's identical stretched-link doc comment
// for why this needs a sibling anchor rather than a nested one.
export const LocationListItem = ({
    location,
    counts,
    selectable = false,
    selected = false,
    onToggle,
    draggable = false,
    dragData,
    droppable = false,
    ancestorPath = [],
    parentLocationId,
}) => {
    const photoUrl = getLocationPhotoUrl(location, PHOTO_SIZE.LIST);
    const photo = getFirstLocationPhoto(location);
    const showPath = !selectable && ancestorPath.length > 0 && !!parentLocationId;

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
                {!showPath && (
                    <span className='block truncate text-xs text-muted-foreground capitalize'>
                        {location.type}
                    </span>
                )}
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
            {location.is_item ? (
                <Tooltip>
                    <TooltipTrigger
                        render={
                            // relative + z-20 (not the inert static z-1 elsewhere in
                            // this file) so this stays hoverable above the search
                            // row's stretched link (showPath branch, z-10) instead
                            // of the hover landing on the invisible link behind it.
                            <span className='relative z-20 flex shrink-0 items-center justify-center rounded-full bg-primary/10 p-1 text-primary [&_svg]:size-3' />
                        }
                    >
                        <LeafIcon />
                    </TooltipTrigger>
                    <TooltipContent>Item</TooltipContent>
                </Tooltip>
            ) : (
                location.is_container && (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <span className='relative z-20 flex shrink-0 items-center justify-center rounded-full bg-flourish/15 p-1 text-flourish [&_svg]:size-3' />
                            }
                        >
                            <PackageIcon />
                        </TooltipTrigger>
                        <TooltipContent>Contenedor</TooltipContent>
                    </Tooltip>
                )
            )}
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

    if (showPath) {
        return (
            <div ref={setRefs} data-block='LocationListItem' className={className} {...dragProps}>
                <Link
                    href={`/location/${location.id}`}
                    aria-label={location.name}
                    className='absolute inset-0 z-10'
                />
                {content}
            </div>
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
