'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Color from 'color';
import { Slider } from '@base-ui/react/slider';
import { EyedropperIcon, DiceFiveIcon } from '@phosphor-icons/react/ssr';
import { Button } from '@/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/ui/input-group';
import { cn } from '@/helpers/utils';

const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

const hexToHsl = hex => {
    try {
        const c = Color(hex);
        return [c.hue(), c.saturationl(), c.lightness()];
    } catch {
        return [0, 100, 50];
    }
};

const slToPosition = (s, l) => {
    const x = s / 100;
    const topL = x < 0.01 ? 100 : 50 + 50 * (1 - x);
    const y = topL > 0 ? 1 - l / topL : 0;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
};

const positionToSl = (x, y) => {
    const s = x * 100;
    const topL = x < 0.01 ? 100 : 50 + 50 * (1 - x);
    return [s, topL * (1 - y)];
};

const MODES = ['hex', 'rgb', 'hsl'];

const ColorFormatInput = ({ mode, onModeChange, h, s, l, hexInput, onHexChange }) => {
    const cycleMode = () => onModeChange(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);

    const displayValue = (() => {
        if (mode === 'rgb') {
            const [r, g, b] = Color.hsl(h, s, l).rgb().array().map(Math.round);
            return `${r}, ${g}, ${b}`;
        }
        if (mode === 'hsl') {
            return `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
        }
        return hexInput;
    })();

    return (
        <InputGroup className='flex-1'>
            <InputGroupAddon align='inline-start'>
                <InputGroupButton onClick={cycleMode} className='font-mono text-xs uppercase'>
                    {mode}
                </InputGroupButton>
            </InputGroupAddon>
            <InputGroupInput
                value={displayValue}
                onChange={mode === 'hex' ? onHexChange : undefined}
                readOnly={mode !== 'hex'}
                maxLength={mode === 'hex' ? 7 : undefined}
                className='font-mono text-xs'
            />
        </InputGroup>
    );
};

export const ColorSelector = ({ value = '#6366f1', onChange, className }) => {
    const [h, setH] = useState(0);
    const [s, setS] = useState(100);
    const [l, setL] = useState(50);
    const [hexInput, setHexInput] = useState(value);
    const [mode, setMode] = useState('hex');
    const $prevValue = useRef(null);
    const $isDragging = useRef(false);
    const $gradient = useRef(null);

    useEffect(() => {
        if (value !== $prevValue.current) {
            $prevValue.current = value;
            const [h0, s0, l0] = hexToHsl(value);
            setH(h0);
            setS(s0);
            setL(l0);
            setHexInput(value);
        }
    }, [value]);

    const emit = useCallback(
        (newH, newS, newL) => {
            try {
                const hex = Color.hsl(newH, newS, newL).hex();
                $prevValue.current = hex;
                setHexInput(hex);
                onChange?.(hex);
            } catch {}
        },
        [onChange],
    );

    const handlePointer = useCallback(
        e => {
            if (!$gradient.current) return;
            const rect = $gradient.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            const [newS, newL] = positionToSl(x, y);
            setS(newS);
            setL(newL);
            emit(h, newS, newL);
        },
        [h, emit],
    );

    useEffect(() => {
        const onMove = e => {
            if ($isDragging.current) handlePointer(e);
        };
        const onUp = () => {
            $isDragging.current = false;
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [handlePointer]);

    const handleHueChange = useCallback(
        newH => {
            setH(newH);
            emit(newH, s, l);
        },
        [s, l, emit],
    );

    const handleHexInput = useCallback(
        e => {
            const v = e.target.value;
            setHexInput(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                const [newH, newS, newL] = hexToHsl(v);
                $prevValue.current = v;
                setH(newH);
                setS(newS);
                setL(newL);
                onChange?.(v.toUpperCase());
            }
        },
        [onChange],
    );

    // Randomizes hue fully but keeps saturation/lightness in a band that
    // stays legible as a tag/workspace color chip (avoids near-black,
    // near-white, and washed-out greys landing as "random").
    const handleRandomColor = useCallback(() => {
        const newH = Math.random() * 360;
        const newS = 55 + Math.random() * 30;
        const newL = 45 + Math.random() * 15;
        setH(newH);
        setS(newS);
        setL(newL);
        emit(newH, newS, newL);
    }, [emit]);

    const handleEyeDropper = useCallback(async () => {
        try {
            const ed = new EyeDropper();
            const { sRGBHex } = await ed.open();
            const [newH, newS, newL] = hexToHsl(sRGBHex);
            $prevValue.current = sRGBHex;
            setH(newH);
            setS(newS);
            setL(newL);
            setHexInput(sRGBHex);
            onChange?.(sRGBHex);
        } catch {}
    }, [onChange]);

    const [posX, posY] = slToPosition(s, l);

    const background = useMemo(
        () =>
            `linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, transparent), hsl(${h}, 100%, 50%)`,
        [h],
    );

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div
                ref={$gradient}
                className='relative h-36 w-full cursor-crosshair rounded-md'
                style={{ background }}
                onPointerDown={e => {
                    e.preventDefault();
                    $isDragging.current = true;
                    handlePointer(e.nativeEvent);
                }}
            >
                <div
                    className='pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm shadow-black/50'
                    style={{ left: `${posX * 100}%`, top: `${posY * 100}%` }}
                />
            </div>

            <Slider.Root
                className='relative flex h-4 w-full touch-none select-none'
                max={360}
                step={1}
                value={h}
                onValueChange={handleHueChange}
            >
                <Slider.Control className='flex w-full items-center'>
                    <Slider.Track className='relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]'>
                        <Slider.Indicator className='absolute h-full' />
                    </Slider.Track>
                    <Slider.Thumb className='block size-4 rounded-full border-2 border-white bg-white shadow-sm shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' />
                </Slider.Control>
            </Slider.Root>

            <div className='flex items-center gap-2'>
                <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-8 shrink-0'
                    aria-label='Color aleatorio'
                    onClick={handleRandomColor}
                >
                    <DiceFiveIcon className='size-3.5' />
                </Button>
                {supportsEyeDropper && (
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='size-8 shrink-0'
                        onClick={handleEyeDropper}
                    >
                        <EyedropperIcon className='size-3.5' />
                    </Button>
                )}
                <ColorFormatInput
                    mode={mode}
                    onModeChange={setMode}
                    h={h}
                    s={s}
                    l={l}
                    hexInput={hexInput}
                    onHexChange={handleHexInput}
                />
            </div>
        </div>
    );
};
