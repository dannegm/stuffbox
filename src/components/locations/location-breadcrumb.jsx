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
// disappear from the inline row (the page's own hero header already names
// the current item/location, so repeating it in the breadcrumb is redundant
// on a narrow screen) — the first ancestor (root) and the last one
// (`current`'s direct parent — a de-facto "back" button) stay visible
// inline, and a `BreadcrumbEllipsis` opens a `DropdownMenu` with the full
// path instead (shadcn's documented ellipsis+dropdown composition, extended
// into a vertical timeline): root flush at the top, then everything under
// it — middle ancestors, the last ancestor, and `current` — in an indented,
// dot-and-line column so the nesting reads visually, `current` itself
// styled inert (no link, since it's the page already open). Desktop (`sm:`)
// shows the full chain inline instead, `current` included; the mobile-only
// bits are hidden there via `sm:hidden`, the always-visible ones use
// `hidden sm:inline-flex`.
export const LocationBreadcrumb = ({
    workspace,
    ancestors = [],
    current,
    currentIcon,
    // Set only by pages where `current` isn't the page you're already on
    // (e.g. the location edit form, a detour from the split view) — turns
    // the otherwise-inert current crumb into a real link back to it, both
    // inline and in the mobile ellipsis dropdown.
    currentHref,
    className,
}) => {
    const firstAncestor = ancestors[0];
    // Only set when distinct from firstAncestor — a single-ancestor chain
    // (e.g. current sits directly inside a house) has nothing to duplicate.
    const lastAncestor = ancestors.length > 1 ? ancestors[ancestors.length - 1] : null;
    const middleAncestors = ancestors.length > 2 ? ancestors.slice(1, -1) : [];
    // Everything under the root, for the mobile ellipsis dropdown's full-path
    // view — the middle/last ancestors that stay hidden inline on mobile,
    // plus `current` itself (never shown inline there at all).
    const descendantPath = [...ancestors.slice(1), current];

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

                {firstAncestor && (
                    <>
                        <BreadcrumbItem className='sm:hidden'>
                            <ResponsiveDropdownMenu>
                                <ResponsiveDropdownMenuTrigger
                                    render={<Button variant='ghost' size='icon-sm' />}
                                >
                                    <BreadcrumbEllipsis />
                                    <span className='sr-only'>Mostrar ruta completa</span>
                                </ResponsiveDropdownMenuTrigger>
                                <ResponsiveDropdownMenuContent align='start' className='w-64'>
                                    {/* Root sits flush, unindented — everything
                                    below it is "inside" it, so it gets its own
                                    left-margined column with a per-row
                                    connecting line standing in for the
                                    timeline line (drawn per-row, not as one
                                    border-l on the container, so it can stop
                                    at the last row's dot instead of running
                                    past it); each row's dot is offset to sit
                                    centered on that line (-1rem for the
                                    padding back to the line, minus half the
                                    dot's own width). */}
                                    <ResponsiveDropdownMenuItem
                                        render={<Link href={`/location/${firstAncestor.id}`} />}
                                    >
                                        <DynamicIcon icon={getLocationIcon(firstAncestor)} />
                                        {firstAncestor.name}
                                    </ResponsiveDropdownMenuItem>
                                    <div className='ml-4.5 flex flex-col pl-4'>
                                        {descendantPath.map((node, nodeIndex) => {
                                            const isCurrent =
                                                nodeIndex === descendantPath.length - 1;
                                            return (
                                                <div key={node.id} className='relative'>
                                                    <div className='absolute -left-4.5 w-2 top-0 flex h-full flex-col items-center'>
                                                        <span className='relative z-1 flex-1 w-0.5 bg-muted-foreground/30' />

                                                        <span
                                                            className={cn(
                                                                'relative z-2 size-2 rounded-full ring-4 ring-background',
                                                                isCurrent
                                                                    ? 'bg-primary'
                                                                    : 'bg-muted-foreground',
                                                            )}
                                                        />

                                                        <span
                                                            className={cn(
                                                                'relative z-1 flex-1 w-0.5',
                                                                {
                                                                    'bg-muted-foreground/30 ':
                                                                        !isCurrent,
                                                                },
                                                            )}
                                                        />
                                                    </div>

                                                    {isCurrent ? (
                                                        currentHref ? (
                                                            <ResponsiveDropdownMenuItem
                                                                render={<Link href={currentHref} />}
                                                                className='bg-muted font-medium'
                                                            >
                                                                <DynamicIcon icon={currentIcon} />
                                                                {node.name}
                                                            </ResponsiveDropdownMenuItem>
                                                        ) : (
                                                            <div className='flex w-full items-center gap-3 rounded-lg bg-muted px-3 py-2.5 text-left text-sm font-medium [&_svg]:size-4 [&_svg]:shrink-0'>
                                                                <DynamicIcon icon={currentIcon} />
                                                                {node.name}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <ResponsiveDropdownMenuItem
                                                            render={
                                                                <Link
                                                                    href={`/location/${node.id}`}
                                                                />
                                                            }
                                                        >
                                                            <DynamicIcon
                                                                icon={getLocationIcon(node)}
                                                            />
                                                            {node.name}
                                                        </ResponsiveDropdownMenuItem>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
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
                    {currentHref ? (
                        <BreadcrumbLink
                            render={<Link href={currentHref} />}
                            className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-medium hover:bg-muted/70'
                        >
                            <DynamicIcon icon={currentIcon} className='size-3.5 shrink-0' />
                            <span className='max-w-24 truncate sm:max-w-48'>{current.name}</span>
                        </BreadcrumbLink>
                    ) : (
                        <BreadcrumbPage className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-medium'>
                            <DynamicIcon icon={currentIcon} className='size-3.5 shrink-0' />
                            <span className='max-w-24 truncate sm:max-w-48'>{current.name}</span>
                        </BreadcrumbPage>
                    )}
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
};
