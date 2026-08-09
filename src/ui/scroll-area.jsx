import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';

// `nav` adds a pair of "scroll to top"/"scroll to bottom" bars, each only
// rendered while there's actually more content in that direction. They're
// full-width siblings of Viewport (docked above/below it, both still inside
// Root's own flex column) rather than absolutely-positioned overlays — that
// was the first cut, but it floated over whatever row happened to be
// scrolled to that spot, fighting the row's own action buttons (e.g.
// RatedEntitiesDialog's per-row trash button). Docked bars instead claim
// their own shrink-0 slice of Root's height, shrinking Viewport to make
// room, so they can never sit on top of scrolled content.
//
// Recomputed on scroll, on the viewport's own size changing (ResizeObserver —
// e.g. the dialog itself resizing), and on the content's size changing
// (MutationObserver — e.g. RatedEntitiesDialog's list shrinking as the user
// types into its search box, which can flip a still-overflowing list back to
// fully-visible without the viewport itself ever firing a scroll event).
// `onScrollBottom`/`bottomThreshold` mirror VirtualList's own (src/ui/virtual-
// list.jsx) — same "fires on every tick within threshold px of the end, so
// guard your own fetch-more call" contract, for callers that need infinite
// scroll on a plain (non-virtualized) list living in a ScrollArea instead.
function ScrollArea({
    className,
    children,
    nav = false,
    onScrollBottom,
    bottomThreshold = 400,
    ...props
}) {
    const $viewport = React.useRef(null);
    const [canScrollUp, setCanScrollUp] = React.useState(false);
    const [canScrollDown, setCanScrollDown] = React.useState(false);

    const updateNav = React.useCallback(() => {
        const viewport = $viewport.current;
        if (!viewport) return;
        setCanScrollUp(viewport.scrollTop > 1);
        setCanScrollDown(viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1);
    }, []);

    const handleScroll = React.useCallback(() => {
        if (nav) updateNav();
        if (!onScrollBottom) return;
        const viewport = $viewport.current;
        if (!viewport) return;
        const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        if (distanceToBottom < bottomThreshold) onScrollBottom();
    }, [nav, updateNav, onScrollBottom, bottomThreshold]);

    React.useEffect(() => {
        if (!nav) return;
        const viewport = $viewport.current;
        if (!viewport) return;
        updateNav();
        const resizeObserver = new ResizeObserver(updateNav);
        resizeObserver.observe(viewport);
        const mutationObserver = new MutationObserver(updateNav);
        mutationObserver.observe(viewport, { childList: true, subtree: true });
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [nav, updateNav]);

    const scrollToEdge = edge =>
        $viewport.current?.scrollTo({
            top: edge === 'top' ? 0 : $viewport.current.scrollHeight,
            behavior: 'smooth',
        });

    return (
        <ScrollAreaPrimitive.Root
            data-slot='scroll-area'
            // flex/flex-col (not just 'relative') so the Viewport below can
            // size itself via flex-1/min-h-0 instead of the `size-full`
            // (height: 100%) it used to rely on. A percentage height only
            // resolves against a parent with an explicitly specified height
            // — when Root's own height instead comes from a `max-h-*` clamp
            // (as in e.g. LocationPicker's mobile sheet) or otherwise isn't
            // "specified" by CSS's own definition, `height: 100%` on
            // Viewport falls back to `auto`, so Viewport silently grew to
            // fit its content instead of the space Root actually had,
            // spilling out past Root's box (which had no overflow-hidden of
            // its own either) and overlapping whatever sat below it. A flex
            // item's main size, unlike a percentage height, is always
            // "definite" post-layout per the flexbox spec — regardless of
            // whether Root's own height came from flex distribution or a
            // max-height clamp — so flex-1/min-h-0 sidesteps the whole
            // percentage-resolution pitfall. overflow-hidden is a plain
            // safety net so nothing can visually escape Root's box even if
            // this ever gets nested oddly again.
            className={cn('relative flex flex-col overflow-hidden', className)}
            {...props}
        >
            {nav && canScrollUp && (
                <button
                    type='button'
                    aria-label='Ir arriba'
                    onClick={() => scrollToEdge('top')}
                    className='flex w-full shrink-0 items-center justify-center rounded-t-[inherit] border-b bg-muted/50 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5'
                >
                    <CaretUpIcon />
                </button>
            )}
            <ScrollAreaPrimitive.Viewport
                ref={$viewport}
                onScroll={nav || onScrollBottom ? handleScroll : undefined}
                data-slot='scroll-area-viewport'
                className='min-h-0 w-full flex-1 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1'
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
            {nav && canScrollDown && (
                <button
                    type='button'
                    aria-label='Ir abajo'
                    onClick={() => scrollToEdge('bottom')}
                    className='flex w-full shrink-0 items-center justify-center rounded-b-[inherit] border-t bg-muted/50 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5'
                >
                    <CaretDownIcon />
                </button>
            )}
        </ScrollAreaPrimitive.Root>
    );
}

// Overlay-style: invisible at rest, fades in only while the pointer is over
// the scroll area or a scroll is actually happening (Base UI's own
// `data-hovering`/`data-scrolling`, set on this element) — so it never sits
// on screen as a permanent bar when the content isn't being scrolled.
function ScrollBar({ className, orientation = 'vertical', ...props }) {
    return (
        <ScrollAreaPrimitive.Scrollbar
            data-slot='scroll-area-scrollbar'
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                'flex touch-none p-px opacity-0 transition-[color,opacity] select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent data-hovering:opacity-100 data-scrolling:opacity-100',
                className,
            )}
            {...props}
        >
            <ScrollAreaPrimitive.Thumb
                data-slot='scroll-area-thumb'
                className='relative flex-1 rounded-full bg-border'
            />
        </ScrollAreaPrimitive.Scrollbar>
    );
}

export { ScrollArea, ScrollBar };
