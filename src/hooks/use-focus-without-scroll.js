import { useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Replaces the native `autoFocus` attribute inside Popover content — autoFocus
// calls the browser's default .focus(), which scrolls the element into view
// if it isn't already, and that can fire *before* Floating UI finishes
// placing the popover next to its trigger (portaled content briefly sits at
// its pre-positioning spot, often the very bottom of <body>). The page then
// scrolls all the way down to reveal that transient position, and never
// reverts once the popover snaps to where it actually belongs.
// `{ preventScroll: true }` skips that scroll entirely.
//
// Skipped on mobile entirely — these callers render inside a Drawer there
// (ResponsivePopover), and autofocusing pops the keyboard open the instant
// the bottom sheet appears, which is jarring rather than helpful. The
// scroll-jump problem this hook solves only exists for the floating Popover
// on desktop in the first place.
export const useFocusWithoutScroll = () => {
    const isMobile = useIsMobile();
    return useCallback(
        node => {
            if (!isMobile) node?.focus({ preventScroll: true });
        },
        [isMobile],
    );
};
