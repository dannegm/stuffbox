'use client';

import { useEffect, useState } from 'react';
import { ArrowsDownUpIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react/ssr';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/helpers/utils';

// Ported from ../aura/src/components/system/breakpoint-indicator.jsx — same
// Tailwind-breakpoint-via-visibility-classes trick (only the matching <span>
// renders), instead of matchMedia. Toggle + corner both come from
// debugTools.breakpointIndicator in default-settings.js, editable on
// /admin/settings — off by default.
export const BREAKPOINT_INDICATOR_POSITION_LABELS = {
    'top-left': 'Arriba izquierda',
    'top-center': 'Arriba centro',
    'top-right': 'Arriba derecha',
    'middle-left': 'Centro izquierda',
    'middle-right': 'Centro derecha',
    'bottom-left': 'Abajo izquierda',
    'bottom-center': 'Abajo centro',
    'bottom-right': 'Abajo derecha',
};

export const BREAKPOINT_INDICATOR_POSITIONS = Object.keys(BREAKPOINT_INDICATOR_POSITION_LABELS);

const POSITION_CLASSES = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'middle-left': 'left-4 top-1/2 -translate-y-1/2',
    'middle-right': 'right-4 top-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
};

export const BreakpointIndicator = () => {
    const [enabled] = useSettings('debugTools.breakpointIndicator.enabled', false);
    const [position] = useSettings('debugTools.breakpointIndicator.position', 'bottom-right');
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        if (!enabled) return;
        const handleResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div
            className={cn(
                'fixed z-50 flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-sm font-bold text-white shadow-lg shadow-black/30 [&_svg]:size-3.5',
                POSITION_CLASSES[position] ?? POSITION_CLASSES['bottom-right'],
            )}
            data-block='BreakpointIndicator'
        >
            <span className='block sm:hidden'>XS</span>
            <span className='hidden sm:block md:hidden'>SM</span>
            <span className='hidden md:block lg:hidden'>MD</span>
            <span className='hidden lg:block xl:hidden'>LG</span>
            <span className='hidden xl:block 2xl:hidden'>XL</span>
            <span className='hidden 2xl:block'>2XL</span>
            <span>•</span>
            <span className='flex items-center gap-1'>
                <ArrowsLeftRightIcon />
                {size.w}
            </span>
            <span className='flex items-center gap-1'>
                <ArrowsDownUpIcon />
                {size.h}
            </span>
        </div>
    );
};
