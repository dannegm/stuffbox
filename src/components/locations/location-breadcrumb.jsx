import Link from 'next/link';
import { CaretRightIcon, DotsThreeIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { cn } from '@/helpers/utils';

// Icon lives inside the same color-carrying element as the text (not a
// sibling of it) so it inherits `current`/hover text color instead of
// staying at the <nav>'s base muted color. Each crumb is width-capped so
// `truncate` actually has something to clip against — without a bound, a
// long location name just grows the row past a 380px viewport instead of
// clipping, since `flex-wrap` alone doesn't constrain a single item's width.
const Crumb = ({ className, href, icon, children, index = 0, current = false }) => (
    <span className={cn('flex min-w-0 shrink items-center gap-1', className)}>
        <CaretRightIcon
            className={cn('size-3.5 shrink-0 text-muted-foreground/60', {
                'hidden sm:block': index === 0,
            })}
        />
        {current ? (
            <span className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground'>
                {icon}
                <span className='max-w-32 truncate sm:max-w-48'>{children}</span>
            </span>
        ) : (
            <Link
                href={href}
                className='flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground'
            >
                {icon}
                <span className='max-w-24 truncate sm:max-w-36'>{children}</span>
            </Link>
        )}
    </span>
);

// `currentIcon` is explicit rather than derived from `current` because this
// breadcrumb is shared by location pages (current = a location, icon via
// getLocationIcon) and the item page (current = an item, icon is its own
// `item.icon` field) — two different shapes, same component.
export const LocationBreadcrumb = ({
    workspace,
    ancestors = [],
    current,
    currentIcon,
    className,
}) => (
    <nav
        data-block='LocationBreadcrumb'
        className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground',
            className,
        )}
    >
        <Link
            href={`/workspace/${workspace.id}`}
            className='hidden sm:flex min-w-0 shrink items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground'
        >
            <span
                className='size-2 shrink-0 rounded-full bg-(--bullet-color)'
                style={{ '--bullet-color': resolveWorkspaceColor(workspace) }}
            />
            <span className='max-w-24 truncate sm:max-w-36'>{workspace.name}</span>
        </Link>

        {ancestors.map((ancestor, index) => (
            <Crumb
                key={ancestor.id}
                index={index}
                href={`/location/${ancestor.id}`}
                className={cn({
                    'hidden sm:flex': index > 0,
                })}
                icon={
                    <DynamicIcon icon={getLocationIcon(ancestor)} className='size-3.5 shrink-0' />
                }
            >
                {ancestor.name}
            </Crumb>
        ))}

        <span className={cn('flex sm:hidden min-w-0 shrink items-center gap-1')}>
            <CaretRightIcon className='size-3.5 shrink-0 text-muted-foreground/60' />
            <DotsThreeIcon className='size-4 shrink-0' />
        </span>

        <Crumb
            icon={<DynamicIcon icon={currentIcon} className='size-3.5 shrink-0' />}
            index={ancestors.length}
            current
        >
            {current.name}
        </Crumb>
    </nav>
);
