import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { getLocationIcon, getLocationPhotoUrl } from '@/helpers/location';
import { cn } from '@/helpers/utils';

// `counts` = { locations, items } — direct/root-level only, not recursive.
// Omitted entirely when both are 0 rather than showing "0 location(s)".
// `selectable` swaps the row from a navigating Link to a toggle button, same
// as ItemListRow.
export const LocationListItem = ({
    location,
    counts,
    selectable = false,
    selected = false,
    onToggle,
}) => {
    const photoUrl = getLocationPhotoUrl(location);
    const summary = [
        counts?.locations > 0 && `${counts.locations} location(s)`,
        counts?.items > 0 && `${counts.items} item(s)`,
    ]
        .filter(Boolean)
        .join(' · ');

    const className = cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted',
        selected && 'border-primary bg-primary/5',
    );

    const content = (
        <>
            {selectable && (
                <Checkbox checked={selected} onCheckedChange={() => onToggle(location.id)} />
            )}
            <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt='' className='size-full object-cover' />
                ) : (
                    <DynamicIcon icon={getLocationIcon(location)} />
                )}
            </span>
            <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{location.name}</span>
                <span className='block truncate text-xs text-muted-foreground capitalize'>
                    {location.type}
                    {summary && <> · {summary}</>}
                </span>
            </span>
            {!selectable && <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />}
        </>
    );

    if (selectable) {
        return (
            <button
                type='button'
                data-block='LocationListItem'
                className={className}
                onClick={() => onToggle(location.id)}
            >
                {content}
            </button>
        );
    }

    return (
        <Link href={`/location/${location.id}`} data-block='LocationListItem' className={className}>
            {content}
        </Link>
    );
};
