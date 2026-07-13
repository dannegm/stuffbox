import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon, getLocationPhotoUrl } from '@/helpers/location';

// `counts` = { locations, items } — direct/root-level only, not recursive.
// Omitted entirely when both are 0 rather than showing "0 location(s)".
export const LocationListItem = ({ location, counts }) => {
    const photoUrl = getLocationPhotoUrl(location);
    const summary = [
        counts?.locations > 0 && `${counts.locations} location(s)`,
        counts?.items > 0 && `${counts.items} item(s)`,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Link
            href={`/location/${location.id}`}
            data-block='LocationListItem'
            className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted'
        >
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
            <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />
        </Link>
    );
};
