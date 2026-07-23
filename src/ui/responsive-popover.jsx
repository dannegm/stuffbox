'use client';

import { createContext, useContext } from 'react';
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

// Same render-vs-children/asChild normalization as ResponsiveDialogTrigger.
export const ResponsivePopoverTrigger = ({ render, ...props }) => {
    const isMobile = useResponsivePopoverMobile();
    if (isMobile) {
        return (
            <DrawerTrigger asChild data-slot='responsive-popover-trigger' {...props}>
                {render}
            </DrawerTrigger>
        );
    }
    return <PopoverTrigger data-slot='responsive-popover-trigger' render={render} {...props} />;
};

// align/side/sideOffset only mean something for a floating Popover — a
// Drawer is always a full-width bottom sheet, so they're dropped rather than
// leaked as unknown DOM attributes. className's own width utility (e.g.
// w-64) is overridden to w-full on mobile; cn() puts that override last so
// twMerge lets it win while every other passed-in class still applies.
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
                className={cn(className, 'w-full')}
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
