'use client';

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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
export const VirtualList = ({
    items,
    estimateSize,
    getItemKey,
    renderItem,
    footer,
    onScrollBottom,
    bottomThreshold = 400,
    overscan = 6,
    className,
}) => {
    const $scroll = React.useRef(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => $scroll.current,
        estimateSize,
        getItemKey: index => getItemKey(items[index], index),
        overscan,
    });

    const handleScroll = () => {
        const el = $scroll.current;
        if (!el || !onScrollBottom) return;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceToBottom < bottomThreshold) onScrollBottom();
    };

    return (
        <div
            ref={$scroll}
            onScroll={handleScroll}
            data-slot='virtual-list'
            className={cn('min-h-0 overflow-y-auto', className)}
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
    );
};
