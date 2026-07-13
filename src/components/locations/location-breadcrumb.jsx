import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { cn } from '@/helpers/utils';

// Icon lives inside the same color-carrying element as the text (not a
// sibling of it) so it inherits `current`/hover text color instead of
// staying at the <nav>'s base muted color.
const Crumb = ({ href, icon, children, current = false }) => (
    <span className='flex items-center gap-1'>
        <CaretRightIcon className='size-3.5 shrink-0' />
        {current ? (
            <span className='flex items-center gap-1 truncate font-medium text-foreground'>
                {icon}
                {children}
            </span>
        ) : (
            <Link href={href} className='flex items-center gap-1 truncate hover:text-foreground'>
                {icon}
                {children}
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
            className='flex items-center gap-1.5 truncate hover:text-foreground'
        >
            <span
                className='size-2 shrink-0 rounded-full bg-(--bullet-color)'
                style={{ '--bullet-color': resolveWorkspaceColor(workspace) }}
            />
            {workspace.name}
        </Link>
        {ancestors.map(ancestor => (
            <Crumb
                key={ancestor.id}
                href={`/location/${ancestor.id}`}
                icon={
                    <DynamicIcon icon={getLocationIcon(ancestor)} className='size-3.5 shrink-0' />
                }
            >
                {ancestor.name}
            </Crumb>
        ))}
        <Crumb current icon={<DynamicIcon icon={currentIcon} className='size-3.5 shrink-0' />}>
            {current.name}
        </Crumb>
    </nav>
);
