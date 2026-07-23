import { Fragment } from 'react';
import Link from 'next/link';
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/ui/breadcrumb';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';
import { Button } from '@/ui/button';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { cn } from '@/helpers/utils';

// `currentIcon` is explicit rather than derived from `current` because this
// breadcrumb is shared by location pages (current = a location, icon via
// getLocationIcon) and the item page (current = an item, icon is its own
// `item.icon` field) — two different shapes, same component.
//
// Responsive shape: on mobile the workspace crumb and `current` itself both
// disappear (the page's own hero header already names the current item/
// location, so repeating it in the breadcrumb is redundant on a narrow
// screen) — the first ancestor (root) and the last one (`current`'s direct
// parent — a de-facto "back" button) stay visible, and whatever's between
// them collapses behind a `BreadcrumbEllipsis` that opens a `DropdownMenu`
// listing those hidden ancestors (shadcn's documented ellipsis+dropdown
// composition) — not a static "…", an actual way back to them. Desktop
// (`sm:`) shows the full chain instead, `current` included; the mobile-only
// bits are hidden there via `sm:hidden`, the always-visible ones use
// `hidden sm:inline-flex`.
export const LocationBreadcrumb = ({
    workspace,
    ancestors = [],
    current,
    currentIcon,
    className,
}) => {
    const firstAncestor = ancestors[0];
    // Only set when distinct from firstAncestor — a single-ancestor chain
    // (e.g. current sits directly inside a house) has nothing to duplicate.
    const lastAncestor = ancestors.length > 1 ? ancestors[ancestors.length - 1] : null;
    const middleAncestors = ancestors.length > 2 ? ancestors.slice(1, -1) : [];

    return (
        <Breadcrumb data-block='LocationBreadcrumb' className={cn('min-w-0', className)}>
            <BreadcrumbList>
                <BreadcrumbItem className='hidden min-w-0 shrink sm:inline-flex'>
                    <BreadcrumbLink
                        render={<Link href={`/workspace/${workspace.id}`} />}
                        className='flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted'
                    >
                        <span
                            className='size-2 shrink-0 rounded-full bg-(--bullet-color)'
                            style={{ '--bullet-color': resolveWorkspaceColor(workspace) }}
                        />
                        <span className='max-w-24 truncate sm:max-w-36'>{workspace.name}</span>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className='hidden sm:flex' />

                {firstAncestor && (
                    <>
                        <BreadcrumbItem className='min-w-0 shrink'>
                            <BreadcrumbLink
                                render={<Link href={`/location/${firstAncestor.id}`} />}
                                className='flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted'
                            >
                                <DynamicIcon
                                    icon={getLocationIcon(firstAncestor)}
                                    className='size-3.5 shrink-0'
                                />
                                <span className='max-w-24 truncate sm:max-w-36'>
                                    {firstAncestor.name}
                                </span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {/* Followed by `current` (hidden on mobile) only when
                        there's no lastAncestor to separate it from instead —
                        otherwise this separator leads into the middle/dropdown
                        content, which stays visible on mobile too. */}
                        <BreadcrumbSeparator className={cn(!lastAncestor && 'hidden sm:flex')} />
                    </>
                )}

                {middleAncestors.map(ancestor => (
                    <Fragment key={ancestor.id}>
                        <BreadcrumbItem className='hidden min-w-0 shrink sm:inline-flex'>
                            <BreadcrumbLink
                                render={<Link href={`/location/${ancestor.id}`} />}
                                className='flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted'
                            >
                                <DynamicIcon
                                    icon={getLocationIcon(ancestor)}
                                    className='size-3.5 shrink-0'
                                />
                                <span className='max-w-36 truncate'>{ancestor.name}</span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className='hidden sm:flex' />
                    </Fragment>
                ))}

                {middleAncestors.length > 0 && (
                    <>
                        <BreadcrumbItem className='sm:hidden'>
                            <ResponsiveDropdownMenu>
                                <ResponsiveDropdownMenuTrigger
                                    render={<Button variant='ghost' size='icon-sm' />}
                                >
                                    <BreadcrumbEllipsis />
                                    <span className='sr-only'>Mostrar ruta completa</span>
                                </ResponsiveDropdownMenuTrigger>
                                <ResponsiveDropdownMenuContent align='start'>
                                    {middleAncestors.map(ancestor => (
                                        <ResponsiveDropdownMenuItem
                                            key={ancestor.id}
                                            render={<Link href={`/location/${ancestor.id}`} />}
                                        >
                                            <DynamicIcon icon={getLocationIcon(ancestor)} />
                                            {ancestor.name}
                                        </ResponsiveDropdownMenuItem>
                                    ))}
                                </ResponsiveDropdownMenuContent>
                            </ResponsiveDropdownMenu>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className='sm:hidden' />
                    </>
                )}

                {lastAncestor && (
                    <>
                        <BreadcrumbItem className='min-w-0 shrink'>
                            <BreadcrumbLink
                                render={<Link href={`/location/${lastAncestor.id}`} />}
                                className='flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted'
                            >
                                <DynamicIcon
                                    icon={getLocationIcon(lastAncestor)}
                                    className='size-3.5 shrink-0'
                                />
                                <span className='max-w-18 truncate sm:max-w-36'>
                                    {lastAncestor.name}
                                </span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {/* Always leads into `current`, which is mobile-hidden. */}
                        <BreadcrumbSeparator className='hidden sm:flex' />
                    </>
                )}

                <BreadcrumbItem className='hidden min-w-0 shrink sm:inline-flex'>
                    <BreadcrumbPage className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-medium'>
                        <DynamicIcon icon={currentIcon} className='size-3.5 shrink-0' />
                        <span className='max-w-24 truncate sm:max-w-48'>{current.name}</span>
                    </BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
};
