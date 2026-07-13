import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';

export const LocationListItem = ({ location }) => (
    <Link
        href={`/location/${location.id}`}
        data-block='LocationListItem'
        className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted'
    >
        <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
            <DynamicIcon icon={getLocationIcon(location)} />
        </span>
        <span className='min-w-0 flex-1'>
            <span className='block truncate font-medium'>{location.name}</span>
            <span className='block truncate text-xs text-muted-foreground capitalize'>
                {location.type}
            </span>
        </span>
        <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />
    </Link>
);
