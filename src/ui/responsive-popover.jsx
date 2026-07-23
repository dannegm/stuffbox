'use client';

import { cloneElement, createContext, useContext } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger } from '@/ui/drawer';
import { cn } from '@/helpers/utils';

// Same shape as ResponsiveDialog (src/ui/responsive-dialog.jsx): a floating
// Popover on desktop, a bottom Drawer on mobile — for every "pick one/several
// from a list" trigger (SelectSearch, IconPicker, ColorPicker, tag pickers,
// search filters) that isn't really a form, so ResponsiveDialog doesn't fit,
// but tapping a small anchored popup on a phone is still fiddly.
const ResponsivePopoverMobileContext = createContext(false);
const useResponsivePopoverMobile = () => useContext(ResponsivePopoverMobileContext);

export const ResponsivePopover = ({ children, ...props }) => {
    const isMobile = useIsMobile();
    const Root = isMobile ? Drawer : Popover;
    return (
        <ResponsivePopoverMobileContext.Provider value={isMobile}>
            <Root data-slot='responsive-popover' {...props}>
                {children}
            </Root>
        </ResponsivePopoverMobileContext.Provider>
    );
};

// Same render-vs-children/asChild normalization as ResponsiveDialogTrigger,
// plus one more wrinkle: Popover's `render` convention is a bare shell
// element (e.g. an empty <button/>) with the actual visible content passed
// as `children` alongside it — Base UI renders that content *inside* the
// resolved element. vaul's asChild has no such second slot, it only clones
// `render` verbatim, so `children` has to be spliced into it by hand here —
// but only when the caller actually used the two-prop shape; some callers
// (IconPicker, ColorPicker) pass one fully-formed element as `render` with
// no separate `children` at all, and cloning would wipe out its content.
export const ResponsivePopoverTrigger = ({ render, children, ...props }) => {
    const isMobile = useResponsivePopoverMobile();
    if (isMobile) {
        const triggerElement = children !== undefined ? cloneElement(render, {}, children) : render;
        return (
            <DrawerTrigger asChild data-slot='responsive-popover-trigger' {...props}>
                {triggerElement}
            </DrawerTrigger>
        );
    }
    return (
        <PopoverTrigger data-slot='responsive-popover-trigger' render={render} {...props}>
            {children}
        </PopoverTrigger>
    );
};

// align/side/sideOffset only mean something for a floating Popover — a
// Drawer is always a full-width bottom sheet, so they're dropped rather than
// leaked as unknown DOM attributes. PopoverContent always bakes in its own
// p-4, but DrawerContent has none of its own (every other Drawer user adds
// padding on its own sub-sections instead) — 'p-4' here is only a fallback
// default, ahead of className so a caller's own padding (e.g. SelectSearch's
// gap-2 p-2) still wins; 'w-full' is last so it always overrides any width
// utility in className, regardless of what the caller passed.
export const ResponsivePopoverContent = ({
    className,
    align,
    alignOffset,
    side,
    sideOffset,
    ...props
}) => {
    const isMobile = useResponsivePopoverMobile();
    if (isMobile) {
        return (
            <DrawerContent
                data-slot='responsive-popover-content'
                className={cn('p-4', className, 'w-full')}
                {...props}
            />
        );
    }
    return (
        <PopoverContent
            data-slot='responsive-popover-content'
            className={className}
            align={align}
            alignOffset={alignOffset}
            side={side}
            sideOffset={sideOffset}
            {...props}
        />
    );
};
