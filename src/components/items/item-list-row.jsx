import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getItemIcon, getItemPhotoUrl } from '@/helpers/item';

export const ItemListRow = ({ item }) => {
    const photoUrl = getItemPhotoUrl(item);

    return (
        <Link
            href={`/item/${item.id}`}
            data-block='ItemListRow'
            className='flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted'
        >
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
            <CaretRightIcon className='size-4 shrink-0 text-muted-foreground' />
        </Link>
    );
};
