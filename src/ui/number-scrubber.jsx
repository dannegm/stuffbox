'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/ssr';
import { Input } from '@/ui/input';
import { cn } from '@/helpers/utils';

// Ported from ../bins/src/ui/number-scrubber.jsx — a number input you can
// also drag horizontally (grab the "↔" handle, or the input itself) to
// scrub the value, on top of typing/spinners like any other number input.
export const NumberScrubber = ({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    scrubSensitivity = 0.5,
    className,
    ref,
    ...rest
}) => {
    const [internal, setInternal] = useState(value);
    const $isDragging = useRef(false);
    const $initialX = useRef(0);
    const $initialValue = useRef(value);

    const decimals = useMemo(() => {
        const part = step.toString().split('.')[1];
        return part ? part.length : 0;
    }, [step]);

    const clamp = n => {
        const quantized = Math.round(n / step) * step;
        return parseFloat(Math.max(min, Math.min(quantized, max)).toFixed(decimals));
    };

    const handlePointerDown = event => {
        if (event.button !== 0) return;
        $isDragging.current = true;
        $initialX.current = event.clientX;
        $initialValue.current = internal;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
    };

    const handlePointerMove = event => {
        if (!$isDragging.current) return;
        const next = clamp(
            $initialValue.current + (event.clientX - $initialX.current) * step * scrubSensitivity,
        );
        setInternal(next);
        onChange(next);
    };

    const handlePointerUp = () => {
        $isDragging.current = false;
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
    };

    const handleChange = event => {
        const parsed = parseFloat(event.target.value);
        const next = clamp(isNaN(parsed) ? min : parsed);
        setInternal(next);
        onChange(next);
    };

    useEffect(() => {
        setInternal(value);
    }, [value]);

    return (
        <div className='group relative w-fit' data-block='NumberScrubber'>
            <Input
                ref={ref}
                type='number'
                step={step}
                value={internal}
                onChange={handleChange}
                onPointerDown={handlePointerDown}
                className={cn(
                    'pr-6 [appearance:textfield] hover:cursor-ew-resize active:cursor-none',
                    '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                    className,
                )}
                {...rest}
            />
            <div
                onPointerDown={handlePointerDown}
                className='absolute inset-y-0 right-0 flex cursor-ew-resize items-center px-2 text-muted-foreground select-none [&>svg]:size-3.5'
            >
                <ArrowsLeftRightIcon />
            </div>
        </div>
    );
};
