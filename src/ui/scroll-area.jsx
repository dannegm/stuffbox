import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import { cn } from '@/helpers/utils';

function ScrollArea({ className, children, ...props }) {
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
            <ScrollAreaPrimitive.Viewport
                data-slot='scroll-area-viewport'
                className='min-h-0 w-full flex-1 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1'
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}

function ScrollBar({ className, orientation = 'vertical', ...props }) {
    return (
        <ScrollAreaPrimitive.Scrollbar
            data-slot='scroll-area-scrollbar'
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                'flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent',
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
