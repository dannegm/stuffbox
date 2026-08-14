'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/helpers/utils';

// @property registers typed custom properties so the browser can transition
// them like numbers (needed to animate the mask-image alphas smoothly) —
// ported from aura's ../aura/src/ui/marquee-text.jsx.
const MARQUEE_CSS = `
    @property --marquee-left-alpha {
        syntax: '<number>';
        initial-value: 1;
        inherits: false;
    }
    @property --marquee-right-alpha {
        syntax: '<number>';
        initial-value: 0;
        inherits: false;
    }
`;

// Only scrolls when the text actually overflows its container — otherwise
// renders as a normal static line. Requires a width-constrained ancestor
// (e.g. `min-w-0` on a flex item) so `clientWidth` reflects a real limit
// instead of growing to fit the content.
export const MarqueeText = ({ children, className, pause = 3 }) => {
    const $container = useRef(null);
    const $text = useRef(null);
    const [offset, setOffset] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const [leftAlpha, setLeftAlpha] = useState(1);
    const [rightAlpha, setRightAlpha] = useState(0);
    const $phase = useRef('idle');
    const $timer = useRef(null);
    const $pause = useRef(pause);
    const $offset = useRef(offset);
    $pause.current = pause;
    $offset.current = offset;

    useEffect(() => {
        const container = $container.current;
        const text = $text.current;
        if (!container || !text) return;
        const overflow = text.scrollWidth - container.clientWidth;
        setOffset(overflow > 0 ? -overflow : 0);
    }, [children]);

    const shouldScroll = offset < 0;
    const scrollDuration = Math.abs(offset) / 30;

    useEffect(() => {
        clearTimeout($timer.current);
        $phase.current = 'idle';
        setTranslateX(0);
        setLeftAlpha(1);
        setRightAlpha(shouldScroll ? 0 : 1);

        if (!shouldScroll) return;

        $timer.current = setTimeout(() => {
            $phase.current = 'scrolling-end';
            setLeftAlpha(0);
            setTranslateX(offset);
        }, $pause.current * 1000);

        return () => clearTimeout($timer.current);
    }, [offset, shouldScroll]);

    const handleTransitionEnd = event => {
        if (event.propertyName !== 'transform') return;
        clearTimeout($timer.current);

        if ($phase.current === 'scrolling-end') {
            $phase.current = 'paused-end';
            setRightAlpha(1);
            $timer.current = setTimeout(() => {
                setRightAlpha(0);
                $timer.current = setTimeout(() => {
                    $phase.current = 'scrolling-start';
                    setTranslateX(0);
                }, 350);
            }, $pause.current * 1000);
        } else if ($phase.current === 'scrolling-start') {
            $phase.current = 'paused-start';
            setLeftAlpha(1);
            $timer.current = setTimeout(() => {
                setLeftAlpha(0);
                $timer.current = setTimeout(() => {
                    $phase.current = 'scrolling-end';
                    setTranslateX($offset.current);
                }, 350);
            }, $pause.current * 1000);
        }
    };

    const maskImage = shouldScroll
        ? 'linear-gradient(to right, rgba(0,0,0,var(--marquee-left-alpha)), black 12%, black 88%, rgba(0,0,0,var(--marquee-right-alpha)))'
        : undefined;

    return (
        <>
            <style>{MARQUEE_CSS}</style>
            <div
                ref={$container}
                data-block='MarqueeText'
                className='overflow-hidden'
                style={{
                    maskImage,
                    WebkitMaskImage: maskImage,
                    '--marquee-left-alpha': leftAlpha,
                    '--marquee-right-alpha': rightAlpha,
                    transition: '--marquee-left-alpha 0.35s ease, --marquee-right-alpha 0.35s ease',
                }}
            >
                <span
                    ref={$text}
                    className={cn('inline-block whitespace-nowrap', className)}
                    onTransitionEnd={handleTransitionEnd}
                    style={
                        shouldScroll
                            ? {
                                  transform: `translateX(${translateX}px)`,
                                  transition: `transform ${scrollDuration}s ease-in-out`,
                              }
                            : undefined
                    }
                >
                    {children}
                </span>
            </div>
        </>
    );
};
