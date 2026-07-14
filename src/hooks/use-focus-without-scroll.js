import { useCallback } from 'react';

// Replaces the native `autoFocus` attribute inside Popover content — autoFocus
// calls the browser's default .focus(), which scrolls the element into view
// if it isn't already, and that can fire *before* Floating UI finishes
// placing the popover next to its trigger (portaled content briefly sits at
// its pre-positioning spot, often the very bottom of <body>). The page then
// scrolls all the way down to reveal that transient position, and never
// reverts once the popover snaps to where it actually belongs.
// `{ preventScroll: true }` skips that scroll entirely.
export const useFocusWithoutScroll = () =>
    useCallback(node => node?.focus({ preventScroll: true }), []);
