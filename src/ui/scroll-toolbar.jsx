'use client';

import * as React from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';
import { Button } from '@/ui/button';

// Horizontal counterpart to ScrollArea/VirtualList's `nav` bars (docked
// affordances that claim their own shrink-0 slice instead of overlaying
// content) — three slots: `start`/`end` stay fixed, `children` is the strip
// that actually scrolls. The strip is plain native overflow-x-auto, so touch
// swipe/trackpad gestures work for free on every platform; the chevrons
// (shown only while there's actually more content in that direction, same
// as Bins' tab-bar) are a pointer-only convenience layered on top.
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

            <div className='flex min-w-0 flex-1 items-stretch overflow-hidden'>
                {overflow.left && (
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Desplazar a la izquierda'
                        onClick={() => scroll(-120)}
                        className='shrink-0'
                    >
                        <CaretLeftIcon />
                    </Button>
                )}

                <div
                    ref={$scroll}
                    className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                >
                    {children}
                </div>

                {overflow.right && (
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Desplazar a la derecha'
                        onClick={() => scroll(120)}
                        className='shrink-0'
                    >
                        <CaretRightIcon />
                    </Button>
                )}
            </div>

            {end && <div className='flex shrink-0 items-center gap-1 sm:gap-2'>{end}</div>}
        </div>
    );
};
