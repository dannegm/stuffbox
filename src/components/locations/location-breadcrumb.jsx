import Link from 'next/link';
import { CaretRightIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';

const Crumb = ({ href, children, current = false }) => (
    <span className='flex items-center gap-1'>
        <CaretRightIcon className='size-3.5 shrink-0' />
        {current ? (
            <span className='truncate font-medium text-foreground'>{children}</span>
        ) : (
            <Link href={href} className='truncate hover:text-foreground'>
                {children}
            </Link>
        )}
    </span>
);

export const LocationBreadcrumb = ({ workspace, ancestors = [], current, className }) => (
    <nav
        data-block='LocationBreadcrumb'
        className={cn(
            'flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground',
            className,
        )}
    >
        <Link href={`/workspace/${workspace.id}`} className='truncate hover:text-foreground'>
            {workspace.name}
        </Link>
        {ancestors.map(ancestor => (
            <Crumb key={ancestor.id} href={`/location/${ancestor.id}`}>
                {ancestor.name}
            </Crumb>
        ))}
        <Crumb current>{current.name}</Crumb>
    </nav>
);
