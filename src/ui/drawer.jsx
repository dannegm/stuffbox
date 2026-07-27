'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/helpers/utils';

// Lets DrawerHandle (rendered inside DrawerContent, below) trigger a close
// from its own drag gesture without every caller having to thread
// onOpenChange down through DrawerContent's props — Drawer already has it.
const DrawerCloseContext = React.createContext(() => {});

// Built directly on Base UI's plain Dialog (the same primitive dialog.jsx
// wraps for the desktop path) instead of a dedicated drawer library — this
// is what makes a Menu/Popover/Select opened from inside a drawer share the
// exact same portal/focus context as the drawer itself, so it's correctly
// recognized as "inside" rather than fighting it for clicks. Everything
// Dialog.Root already gives us for free (focus trap, escape-to-close, body
// scroll lock) stays free; the only genuinely custom part below is the
// bottom-sheet presentation and the handle's drag-to-dismiss gesture.
function Drawer({ onOpenChange, ...props }) {
    return (
        <DrawerCloseContext.Provider value={() => onOpenChange?.(false)}>
            <DialogPrimitive.Root data-slot='drawer' onOpenChange={onOpenChange} {...props} />
        </DrawerCloseContext.Provider>
    );
}

function DrawerTrigger({ ...props }) {
    return <DialogPrimitive.Trigger data-slot='drawer-trigger' {...props} />;
}

function DrawerPortal({ ...props }) {
    return <DialogPrimitive.Portal data-slot='drawer-portal' {...props} />;
}

function DrawerClose({ ...props }) {
    return <DialogPrimitive.Close data-slot='drawer-close' {...props} />;
}

function DrawerOverlay({ className, ...props }) {
    return (
        <DialogPrimitive.Backdrop
            data-slot='drawer-overlay'
            className={cn(
                'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
                className,
            )}
            {...props}
        />
    );
}

// Distance/velocity past which a released drag counts as "dismiss" rather
// than "snap back". Distance is a fraction of the sheet's own height (not a
// fixed px value) so it scales with however tall a given sheet's content
// made it.
const DRAG_CLOSE_DISTANCE_RATIO = 0.35;
const DRAG_CLOSE_VELOCITY = 0.5; // px/ms

// Owns the entire drag-to-dismiss gesture itself — dragging can only ever
// start here, never from the sheet's own content. That's the point: no
// scroll-vs-drag disambiguation to get wrong, and nothing like an opt-out
// attribute needed anywhere else in the app (a nested list's scroll, or
// react-easy-crop's own pan/zoom, can never be mistaken for a dismiss drag).
// --drawer-drag-y is a CSS custom property (this project's convention for
// runtime values, e.g. photo-crop-dialog.jsx's --photo-flip-x/y) written
// imperatively during the drag so dragging never triggers a re-render —
// only the final open/close decision goes through React state.
function DrawerHandle({ $popup }) {
    const close = React.useContext(DrawerCloseContext);
    const $drag = React.useRef(null);

    const handlePointerDown = event => {
        if (!$popup.current) return;
        $drag.current = { startY: event.clientY, lastY: event.clientY, lastT: event.timeStamp };
        event.currentTarget.setPointerCapture(event.pointerId);
        $popup.current.style.transition = 'none';
    };

    const handlePointerMove = event => {
        if (!$drag.current || !$popup.current) return;
        const deltaY = Math.max(0, event.clientY - $drag.current.startY);
        $popup.current.style.setProperty('--drawer-drag-y', `${deltaY}px`);
        $drag.current.lastY = event.clientY;
        $drag.current.lastT = event.timeStamp;
    };

    const handlePointerUp = event => {
        if (!$drag.current || !$popup.current) return;
        const { startY, lastY, lastT } = $drag.current;
        const deltaY = Math.max(0, event.clientY - startY);
        const velocity = (event.clientY - lastY) / Math.max(1, event.timeStamp - lastT);
        $drag.current = null;

        const popup = $popup.current;
        popup.style.transition = '';
        popup.style.setProperty('--drawer-drag-y', '0px');

        const height = popup.getBoundingClientRect().height;
        if (deltaY > height * DRAG_CLOSE_DISTANCE_RATIO || velocity > DRAG_CLOSE_VELOCITY) {
            close();
        }
    };

    return (
        <div
            role='presentation'
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className='flex shrink-0 cursor-grab touch-none justify-center py-2 active:cursor-grabbing'
        >
            <div className='h-1 w-25 rounded-full bg-muted' />
        </div>
    );
}

function DrawerContent({ className, children, ...props }) {
    const $popup = React.useRef(null);
    return (
        <DrawerPortal data-slot='drawer-portal'>
            <DrawerOverlay />
            <DialogPrimitive.Popup
                ref={$popup}
                data-slot='drawer-content'
                style={{ '--drawer-drag-y': '0px' }}
                className={cn(
                    'fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[80vh] min-h-0 flex-col rounded-t-xl border-t bg-popover text-sm text-popover-foreground outline-none translate-y-(--drawer-drag-y) data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom',
                    className,
                )}
                {...props}
            >
                <DrawerHandle $popup={$popup} />
                {children}
            </DialogPrimitive.Popup>
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
        <DialogPrimitive.Title
            data-slot='drawer-title'
            className={cn('font-heading text-base font-medium text-foreground', className)}
            {...props}
        />
    );
}

function DrawerDescription({ className, ...props }) {
    return (
        <DialogPrimitive.Description
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
