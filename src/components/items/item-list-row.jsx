import { DynamicIcon } from '@/ui/dynamic-icon';
import { FALLBACK_ITEM_ICON } from '@/constants/location-icons';

// Read-only for now — item/[id] isn't built yet, so this is a plain row
// rather than a link.
export const ItemListRow = ({ item }) => (
    <div
        data-block='ItemListRow'
        className='flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm'
    >
        <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
            <DynamicIcon icon={item.icon ?? FALLBACK_ITEM_ICON} />
        </span>
        <span className='min-w-0 flex-1 truncate font-medium'>{item.name}</span>
        {item.quantity > 1 && (
            <span className='shrink-0 text-xs text-muted-foreground'>×{item.quantity}</span>
        )}
    </div>
);
