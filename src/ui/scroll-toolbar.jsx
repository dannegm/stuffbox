'use client';

import * as React from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';

// Horizontal counterpart to ScrollArea/VirtualList's `nav` bars (docked
// affordances that claim their own shrink-0 slice instead of overlaying
// content) — three slots: `start`/`end` stay fixed, `children` is the strip
// that actually scrolls. The strip is plain native overflow-x-auto, so touch
// swipe/trackpad gestures work for free on every platform; the chevrons
// (shown only while there's actually more content in that direction, thin
// bordered strips edge-to-edge with the row's height, same shape as Bins'
// tab-bar) are a pointer-only convenience layered on top.
export const ScrollToolbar = ({ start, end, children, className, ...props }) => {
    const $scroll = React.useRef(null);
    const [overflow, setOverflow] = React.useState({ left: false, right: false });

    const checkOverflow = React.useCallback(() => {
        const el = $scroll.current;
        if (!el) return;
        setOverflow({
            left: el.scrollLeft > 1,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
        });
    }, []);

    React.useEffect(() => {
        const el = $scroll.current;
        if (!el) return;
        checkOverflow();
        const resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(el);
        const mutationObserver = new MutationObserver(checkOverflow);
        mutationObserver.observe(el, { childList: true, subtree: true });
        el.addEventListener('scroll', checkOverflow, { passive: true });
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            el.removeEventListener('scroll', checkOverflow);
        };
    }, [checkOverflow]);

    const scroll = delta => $scroll.current?.scrollBy({ left: delta, behavior: 'smooth' });

    return (
        <div
            className={cn('flex min-w-0 items-center gap-1 sm:gap-2', className)}
            data-block='ScrollToolbar'
            {...props}
        >
            {start && <div className='flex shrink-0 items-center gap-1 sm:gap-2'>{start}</div>}

            <div className='flex min-w-0 flex-1 items-stretch gap-1 overflow-hidden'>
                {overflow.left && (
                    <button
                        type='button'
                        aria-label='Desplazar a la izquierda'
                        onClick={() => scroll(-120)}
                        className='flex w-5 shrink-0 items-center justify-center self-stretch rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 [&_svg]:size-3'
                    >
                        <CaretLeftIcon />
                    </button>
                )}

                <div className='relative min-w-0 flex-1 overflow-hidden'>
                    <div
                        ref={$scroll}
                        className='flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth sm:gap-2 scrollbar-none [&::-webkit-scrollbar]:hidden'
                    >
                        {children}
                    </div>

                    {/* Fade hint that more content sits off-screen in that
                    direction — same overflow.left/right state driving the
                    chevron buttons, just a passive cue instead of a click
                    target. Assumes a `bg-background` ancestor (true for this
                    component's only current usage); revisit with a
                    `fadeColor` prop if a future caller sits on a card. */}
                    {overflow.left && (
                        <div className='pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-background to-transparent' />
                    )}
                    {overflow.right && (
                        <div className='pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent' />
                    )}
                </div>

                {overflow.right && (
                    <button
                        type='button'
                        aria-label='Desplazar a la derecha'
                        onClick={() => scroll(120)}
                        className='flex w-5 shrink-0 items-center justify-center self-stretch rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 [&_svg]:size-3'
                    >
                        <CaretRightIcon />
                    </button>
                )}
            </div>

            {end && <div className='flex shrink-0 items-center gap-1 sm:gap-2'>{end}</div>}
        </div>
    );
};
