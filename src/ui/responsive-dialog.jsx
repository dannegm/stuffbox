'use client';

import { createContext, useContext } from 'react';
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

// Read once per ResponsiveDialog instance and shared via context — every
// sub-component below used to call useIsMobile() independently, which could
// desync across a resize (Root picks Dialog while Content still picks
// DrawerContent a beat later): Drawer and Dialog are still two different
// component types even though both wrap Base UI's Dialog primitive
// underneath, so a mismatched pair would still unmount/remount oddly.
const ResponsiveDialogMobileContext = createContext(false);
const useResponsiveDialogMobile = () => useContext(ResponsiveDialogMobileContext);

// One API, two presentations: a centered Dialog on desktop, a bottom Drawer
// on mobile — same props either way, so callers never branch on device.
export const ResponsiveDialog = ({ children, ...props }) => {
    const isMobile = useIsMobile();
    const Root = isMobile ? Drawer : Dialog;
    return (
        <ResponsiveDialogMobileContext.Provider value={isMobile}>
            <Root data-slot='responsive-dialog' {...props}>
                {children}
            </Root>
        </ResponsiveDialogMobileContext.Provider>
    );
};

export const ResponsiveDialogTrigger = ({ render, ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Trigger = isMobile ? DrawerTrigger : DialogTrigger;
    return <Trigger data-slot='responsive-dialog-trigger' render={render} {...props} />;
};

export const ResponsiveDialogContent = ({ ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Content = isMobile ? DrawerContent : DialogContent;
    return <Content data-slot='responsive-dialog-content' {...props} />;
};

export const ResponsiveDialogHeader = ({ ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Header = isMobile ? DrawerHeader : DialogHeader;
    return <Header data-slot='responsive-dialog-header' {...props} />;
};

export const ResponsiveDialogFooter = ({ ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Footer = isMobile ? DrawerFooter : DialogFooter;
    return <Footer data-slot='responsive-dialog-footer' {...props} />;
};

export const ResponsiveDialogTitle = ({ ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Title = isMobile ? DrawerTitle : DialogTitle;
    return <Title data-slot='responsive-dialog-title' {...props} />;
};

export const ResponsiveDialogDescription = ({ ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Description = isMobile ? DrawerDescription : DialogDescription;
    return <Description data-slot='responsive-dialog-description' {...props} />;
};

export const ResponsiveDialogClose = ({ render, ...props }) => {
    const isMobile = useResponsiveDialogMobile();
    const Close = isMobile ? DrawerClose : DialogClose;
    return <Close data-slot='responsive-dialog-close' render={render} {...props} />;
};
