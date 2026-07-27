import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/helpers/utils';

// repositionInputs (vaul's default) rewrites the drawer content's inline
// height/bottom on keyboard open based on visualViewport size. For
// short-content drawers (a form that isn't tall enough to cross vaul's own
// "is this drawer tall enough" threshold) it misfires: the box gets stretched
// to near-full-viewport height and shoved upward, and since DrawerFooter is
// `mt-auto` in a flex column, the footer gets pushed down to fill that
// artificial height — a big empty gap opens up right where the focused input
// should be visible. Off by default; the browser's native scroll-into-view
// already keeps a focused input in view without vaul's own repositioning.
function Drawer({ ...props }) {
    return <DrawerPrimitive.Root data-slot='drawer' repositionInputs={false} {...props} />;
}

function DrawerTrigger({ ...props }) {
    return <DrawerPrimitive.Trigger data-slot='drawer-trigger' {...props} />;
}

function DrawerPortal({ ...props }) {
    return <DrawerPrimitive.Portal data-slot='drawer-portal' {...props} />;
}

function DrawerClose({ ...props }) {
    return <DrawerPrimitive.Close data-slot='drawer-close' {...props} />;
}

function DrawerOverlay({ className, ...props }) {
    return (
        <DrawerPrimitive.Overlay
            data-slot='drawer-overlay'
            className={cn(
                'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
                className,
            )}
            {...props}
        />
    );
}

function DrawerContent({ className, children, ...props }) {
    return (
        <DrawerPortal data-slot='drawer-portal'>
            <DrawerOverlay />
            <DrawerPrimitive.Content
                data-slot='drawer-content'
                className={cn(
                    // data-[vaul-drawer-direction=bottom]:max-h-[80vh] mirrors
                    // the existing top-direction cap — without it, h-auto
                    // lets a tall sheet (e.g. LocationPicker with a long list)
                    // grow past the top of the viewport with no way to reach
                    // what scrolled off (position:fixed content isn't part of
                    // page flow, so the page can't just be scrolled to reveal
                    // it). min-h-0 lets a flex-1 child (ScrollArea) actually
                    // shrink and scroll internally instead of forcing the
                    // whole sheet to grow to fit it.
                    'group/drawer-content fixed z-50 flex h-auto min-h-0 flex-col bg-popover text-sm text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm',
                    className,
                )}
                {...props}
            >
                <div className='mx-auto mt-4 hidden h-1 w-25 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block' />
                {children}
            </DrawerPrimitive.Content>
        </DrawerPortal>
    );
}

function DrawerHeader({ className, ...props }) {
    return (
        <div
            data-slot='drawer-header'
            className={cn('flex flex-col gap-0.5 p-4 text-left', className)}
            {...props}
        />
    );
}

function DrawerFooter({ className, ...props }) {
    return (
        <div
            data-slot='drawer-footer'
            className={cn('mt-auto flex flex-col gap-2 p-4', className)}
            {...props}
        />
    );
}

function DrawerTitle({ className, ...props }) {
    return (
        <DrawerPrimitive.Title
            data-slot='drawer-title'
            className={cn('font-heading text-base font-medium text-foreground', className)}
            {...props}
        />
    );
}

function DrawerDescription({ className, ...props }) {
    return (
        <DrawerPrimitive.Description
            data-slot='drawer-description'
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
};
