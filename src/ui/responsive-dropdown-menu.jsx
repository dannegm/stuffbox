'use client';

import { createContext, useContext } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/ui/drawer';
import { cn } from '@/helpers/utils';

// Same shape as ResponsiveDialog/ResponsivePopover: a floating Menu on
// desktop, a bottom Drawer on mobile — for action menus (per-row "…" menus,
// the workspace switcher) where tapping a small anchored menu on a phone is
// fiddlier than a full-width sheet. Trade-off accepted deliberately: items
// become plain clickable rows on mobile, losing Base UI Menu's own
// keyboard/arrow-key navigation — the same trade-off ResponsiveDialog already
// makes for Dialog↔Drawer.
const ResponsiveDropdownMenuMobileContext = createContext(false);
const useResponsiveDropdownMenuMobile = () => useContext(ResponsiveDropdownMenuMobileContext);

export const ResponsiveDropdownMenu = ({ children, ...props }) => {
    const isMobile = useIsMobile();
    const Root = isMobile ? Drawer : DropdownMenu;
    return (
        <ResponsiveDropdownMenuMobileContext.Provider value={isMobile}>
            <Root data-slot='responsive-dropdown-menu' {...props}>
                {children}
            </Root>
        </ResponsiveDropdownMenuMobileContext.Provider>
    );
};

// Callers like the workspace switcher or a row's "…" menu pass `render` as
// a bare shell (SidebarMenuButton, Button) and the actual visible content as
// separate `children` — both DrawerTrigger and DropdownMenuTrigger take
// `render`+`children` the same way, so no per-device branching needed here.
export const ResponsiveDropdownMenuTrigger = ({ render, children, ...props }) => {
    const isMobile = useResponsiveDropdownMenuMobile();
    const Trigger = isMobile ? DrawerTrigger : DropdownMenuTrigger;
    return (
        <Trigger data-slot='responsive-dropdown-menu-trigger' render={render} {...props}>
            {children}
        </Trigger>
    );
};

// align/side/sideOffset only mean something for a floating menu — the
// Drawer is always a full-width bottom sheet. Items get roomier padding on
// mobile (see ITEM_CLASS below) to match this app's other mobile tap targets.
export const ResponsiveDropdownMenuContent = ({
    className,
    align,
    alignOffset,
    side,
    sideOffset,
    disableContentDrag,
    ...props
}) => {
    const isMobile = useResponsiveDropdownMenuMobile();
    if (isMobile) {
        return (
            <DrawerContent
                data-slot='responsive-dropdown-menu-content'
                className={cn(className, 'w-full gap-1 p-2')}
                disableContentDrag={disableContentDrag}
                {...props}
            />
        );
    }
    return (
        <DropdownMenuContent
            data-slot='responsive-dropdown-menu-content'
            className={className}
            align={align}
            alignOffset={alignOffset}
            side={side}
            sideOffset={sideOffset}
            {...props}
        />
    );
};

const ITEM_CLASS =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-hidden select-none data-[variant=destructive]:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

// Selecting an item should both do its thing (navigate, run the action) AND
// close the sheet — DrawerClose already closes on click and merges onClick
// with whatever's passed in, so wrapping each row in one gets both for free.
// `render` (e.g. a Link, for navigation items) + `children` (icon+label)
// work the same way here as on the Trigger above.
export const ResponsiveDropdownMenuItem = ({
    render,
    variant = 'default',
    className,
    children,
    ...props
}) => {
    const isMobile = useResponsiveDropdownMenuMobile();
    if (isMobile) {
        return (
            <DrawerClose
                data-slot='responsive-dropdown-menu-item'
                data-variant={variant}
                className={cn(ITEM_CLASS, className)}
                render={render}
                // `render` here is always something like a Link (an <a>), never
                // a native <button> — DrawerClose (Base UI Dialog.Close)
                // defaults nativeButton to true and warns unless told
                // otherwise. Plain action items (no `render`) still resolve to
                // Close's own default <button>, so they're unaffected either
                // way — but only opt out when there's a custom render.
                nativeButton={render ? false : undefined}
                {...props}
            >
                {children}
            </DrawerClose>
        );
    }
    return (
        <DropdownMenuItem className={className} variant={variant} render={render} {...props}>
            {children}
        </DropdownMenuItem>
    );
};

// Plain div in both modes — DropdownMenuLabel already has no Base UI Menu
// dependency (see its own comment: it deliberately isn't Menu.GroupLabel).
export const ResponsiveDropdownMenuLabel = DropdownMenuLabel;

// Unlike Label, DropdownMenuSeparator IS a Base UI Menu primitive
// (MenuPrimitive.Separator) and throws outside a Menu.Root — a plain divider
// div stands in for it inside the Drawer.
export const ResponsiveDropdownMenuSeparator = ({ className, ...props }) => {
    const isMobile = useResponsiveDropdownMenuMobile();
    if (isMobile) {
        return (
            <div
                data-slot='responsive-dropdown-menu-separator'
                className={cn('-mx-1 my-1 h-px bg-border', className)}
                {...props}
            />
        );
    }
    return <DropdownMenuSeparator className={className} {...props} />;
};
