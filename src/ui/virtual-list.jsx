'use client';

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';

// Self-contained scrollable + virtualized list: only rows near the viewport
// are ever mounted (via @tanstack/react-virtual's absolute-positioned
// windowing), so a list can grow into the thousands without the browser
// accumulating that many DOM nodes. Owns its own scroll element — unlike
// ScrollArea (src/ui/scroll-area.jsx), which wraps Base UI's custom-scrollbar
// primitive, this needs a plain native-overflow div so the virtualizer can
// read real scrollTop/scrollHeight off it directly.
//
// `onScrollBottom` is a plain scroll-position callback (distance to the
// bottom of the *scroll container*, not an IntersectionObserver on any
// particular row) — it fires on every scroll tick once within
// `bottomThreshold` px of the end, so callers should guard their own
// fetch-more call (e.g. `if (hasNextPage && !isFetchingNextPage)
// fetchNextPage()`) rather than relying on this to debounce for them.
//
// `footer` renders as a normal (non-virtualized) trailing element inside the
// same scrollable div, right after the virtualized rows — e.g. a "cargar
// más" trigger that lives at the true end of the list and scrolls with it.
//
// `nav` mirrors ScrollArea's own scroll-to-top/scroll-to-bottom bars (same
// docked-above/below-the-viewport, never-overlaps-content shape) — kept as a
// near-identical copy here rather than shared code, since this component's
// scroll element is a plain div instead of Base UI's ScrollArea primitive.
export const VirtualList = ({
    items,
    estimateSize,
    getItemKey,
    renderItem,
    footer,
    onScrollBottom,
    bottomThreshold = 400,
    overscan = 6,
    nav = false,
    className,
}) => {
    const $scroll = React.useRef(null);
    const [canScrollUp, setCanScrollUp] = React.useState(false);
    const [canScrollDown, setCanScrollDown] = React.useState(false);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => $scroll.current,
        estimateSize,
        getItemKey: index => getItemKey(items[index], index),
        overscan,
    });

    const updateNav = React.useCallback(() => {
        const el = $scroll.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 1);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    }, []);

    React.useEffect(() => {
        if (!nav) return;
        const el = $scroll.current;
        if (!el) return;
        updateNav();
        const resizeObserver = new ResizeObserver(updateNav);
        resizeObserver.observe(el);
        const mutationObserver = new MutationObserver(updateNav);
        mutationObserver.observe(el, { childList: true, subtree: true });
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [nav, updateNav, items.length]);

    const handleScroll = () => {
        const el = $scroll.current;
        if (!el) return;
        if (nav) updateNav();
        if (!onScrollBottom) return;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceToBottom < bottomThreshold) onScrollBottom();
    };

    const scrollToEdge = edge =>
        $scroll.current?.scrollTo({
            top: edge === 'top' ? 0 : $scroll.current.scrollHeight,
            behavior: 'smooth',
        });

    return (
        <div
            data-slot='virtual-list-root'
            className={cn('flex min-h-0 flex-col overflow-hidden', className)}
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
            <div
                ref={$scroll}
                onScroll={handleScroll}
                data-slot='virtual-list'
                className='min-h-0 flex-1 overflow-y-auto'
            >
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: virtualizer.getTotalSize(),
                    }}
                >
                    {virtualizer.getVirtualItems().map(virtualRow => (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {renderItem(items[virtualRow.index], virtualRow.index)}
                        </div>
                    ))}
                </div>
                {footer}
            </div>
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
        </div>
    );
};
