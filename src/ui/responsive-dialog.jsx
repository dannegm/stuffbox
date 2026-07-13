'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/ui/drawer';

// One API, two presentations: a centered Dialog on desktop, a bottom Drawer
// on mobile — same props either way, so callers never branch on device.
export const ResponsiveDialog = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Root = isMobile ? Drawer : Dialog;
    return <Root data-slot='responsive-dialog' {...props} />;
};

// vaul's Drawer.Trigger takes its custom element as `children` + `asChild`
// (Radix-style), while Base UI's Dialog.Trigger takes it as `render` — this
// normalizes both to the `render` convention used everywhere else in this
// codebase (Popover, Dialog, Sheet), so callers never branch on device.
export const ResponsiveDialogTrigger = ({ render, ...props }) => {
    const isMobile = useIsMobile();
    if (isMobile) {
        return (
            <DrawerTrigger asChild data-slot='responsive-dialog-trigger' {...props}>
                {render}
            </DrawerTrigger>
        );
    }
    return <DialogTrigger data-slot='responsive-dialog-trigger' render={render} {...props} />;
};

export const ResponsiveDialogContent = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Content = isMobile ? DrawerContent : DialogContent;
    return <Content data-slot='responsive-dialog-content' {...props} />;
};

export const ResponsiveDialogHeader = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Header = isMobile ? DrawerHeader : DialogHeader;
    return <Header data-slot='responsive-dialog-header' {...props} />;
};

export const ResponsiveDialogFooter = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Footer = isMobile ? DrawerFooter : DialogFooter;
    return <Footer data-slot='responsive-dialog-footer' {...props} />;
};

export const ResponsiveDialogTitle = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Title = isMobile ? DrawerTitle : DialogTitle;
    return <Title data-slot='responsive-dialog-title' {...props} />;
};

export const ResponsiveDialogDescription = ({ ...props }) => {
    const isMobile = useIsMobile();
    const Description = isMobile ? DrawerDescription : DialogDescription;
    return <Description data-slot='responsive-dialog-description' {...props} />;
};

// Same render-vs-children mismatch as the trigger above.
export const ResponsiveDialogClose = ({ render, ...props }) => {
    const isMobile = useIsMobile();
    if (isMobile) {
        return (
            <DrawerClose asChild data-slot='responsive-dialog-close' {...props}>
                {render}
            </DrawerClose>
        );
    }
    return <DialogClose data-slot='responsive-dialog-close' render={render} {...props} />;
};
