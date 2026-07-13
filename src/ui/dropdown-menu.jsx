'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { CheckIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';

function DropdownMenu({ ...props }) {
    return <MenuPrimitive.Root data-slot='dropdown-menu' {...props} />;
}

function DropdownMenuTrigger({ ...props }) {
    return <MenuPrimitive.Trigger data-slot='dropdown-menu-trigger' {...props} />;
}

function DropdownMenuPortal({ ...props }) {
    return <MenuPrimitive.Portal data-slot='dropdown-menu-portal' {...props} />;
}

function DropdownMenuContent({
    className,
    align = 'start',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    ...props
}) {
    return (
        <DropdownMenuPortal>
            <MenuPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className='isolate z-50'
            >
                <MenuPrimitive.Popup
                    data-slot='dropdown-menu-content'
                    className={cn(
                        'z-50 min-w-40 origin-(--transform-origin) overflow-hidden rounded-md bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className,
                    )}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </DropdownMenuPortal>
    );
}

function DropdownMenuGroup({ ...props }) {
    return <MenuPrimitive.Group data-slot='dropdown-menu-group' {...props} />;
}

function DropdownMenuItem({ className, inset, variant = 'default', ...props }) {
    return (
        <MenuPrimitive.Item
            data-slot='dropdown-menu-item'
            data-inset={inset}
            data-variant={variant}
            className={cn(
                "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
    return (
        <MenuPrimitive.CheckboxItem
            data-slot='dropdown-menu-checkbox-item'
            checked={checked}
            className={cn(
                "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
                <MenuPrimitive.CheckboxItemIndicator>
                    <CheckIcon className='size-4' />
                </MenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </MenuPrimitive.CheckboxItem>
    );
}

function DropdownMenuRadioGroup({ ...props }) {
    return <MenuPrimitive.RadioGroup data-slot='dropdown-menu-radio-group' {...props} />;
}

function DropdownMenuRadioItem({ className, children, ...props }) {
    return (
        <MenuPrimitive.RadioItem
            data-slot='dropdown-menu-radio-item'
            className={cn(
                "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
                <MenuPrimitive.RadioItemIndicator>
                    <span className='size-1.5 rounded-full bg-current' />
                </MenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </MenuPrimitive.RadioItem>
    );
}

// Plain div, not Menu.GroupLabel — that part requires a <Menu.Group> ancestor
// (throws otherwise), but this is used as a standalone section heading with
// no associated group semantics.
function DropdownMenuLabel({ className, inset, ...props }) {
    return (
        <div
            data-slot='dropdown-menu-label'
            data-inset={inset}
            className={cn(
                'px-2 py-1.5 text-xs font-medium text-muted-foreground data-[inset]:pl-8',
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuSeparator({ className, ...props }) {
    return (
        <MenuPrimitive.Separator
            data-slot='dropdown-menu-separator'
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}

function DropdownMenuShortcut({ className, ...props }) {
    return (
        <span
            data-slot='dropdown-menu-shortcut'
            className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuPortal,
};
