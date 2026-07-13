import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { getItemIcon, getItemPhotoUrl } from '@/helpers/item';
import { cn } from '@/helpers/utils';

// `selectable` swaps the row from a navigating Link to a toggle button —
// tapping anywhere in the row selects it instead of opening the item, same
// as bulk-select on mobile file pickers.
export const ItemListRow = ({ item, selectable = false, selected = false, onToggle }) => {
    const photoUrl = getItemPhotoUrl(item);

    const className = cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted',
        selected && 'border-primary bg-primary/5',
    );

    const content = (
        <>
            {selectable && (
                <Checkbox checked={selected} onCheckedChange={() => onToggle(item.id)} />
            )}
            <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt='' className='size-full object-cover' />
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
                type='button'
                data-block='ItemListRow'
                className={className}
                onClick={() => onToggle(item.id)}
            >
                {content}
            </button>
        );
    }

    return (
        <Link href={`/item/${item.id}`} data-block='ItemListRow' className={className}>
            {content}
        </Link>
    );
};
