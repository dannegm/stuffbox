'use client';

import { useEffect, useRef, useState } from 'react';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';

// `[-| value |+]` — +/- buttons flanking a value display instead of a typed
// number field, for values better nudged than typed (page counts, etc.).
// `min`/`max` default to null (no clamp on that side). `mask` is a tiny
// `{{value}}` template (e.g. "Mostrar {{value}} etiquetas por página") — the
// surrounding text renders muted, the value itself in the normal foreground
// color, so it reads as one sentence instead of a bare number next to a
// label. With no `mask`, the bare value (or `placeholder` when null) shows.
// Clicking the value itself swaps it for a real number input (mask/label
// text hidden while editing) — nudging works for small adjustments, but a
// value far from the current one shouldn't require dozens of clicks.
export const StepperInput = ({
    value,
    onChange,
    min = null,
    max = null,
    step = 1,
    placeholder,
    mask,
    className,
}) => {
    const $input = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState('');

    useEffect(() => {
        if (isEditing) $input.current?.select();
    }, [isEditing]);

    const clamp = next => {
        let clamped = next;
        if (min != null) clamped = Math.max(min, clamped);
        if (max != null) clamped = Math.min(max, clamped);
        return clamped;
    };

    const handleDecrement = () => onChange(clamp((value ?? 0) - step));
    const handleIncrement = () => onChange(clamp((value ?? 0) + step));

    const isDecrementDisabled = value != null && min != null && value <= min;
    const isIncrementDisabled = value != null && max != null && value >= max;

    const startEditing = () => {
        setDraft(value != null ? String(value) : '');
        setIsEditing(true);
    };

    // Empty/unparseable draft on commit just discards the edit (reverts to
    // the last real value) instead of forcing a fallback like 0 — nothing
    // was typed, so nothing should change.
    const commitEditing = () => {
        setIsEditing(false);
        const parsed = Number(draft);
        if (draft.trim() === '' || Number.isNaN(parsed)) return;
        onChange(clamp(parsed));
    };

    const handleKeyDown = event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            $input.current?.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditing(false);
        }
    };

    const renderValue = () => {
        if (value == null) {
            return <span className='text-muted-foreground'>{placeholder}</span>;
        }
        if (!mask) {
            return <span className='font-medium tabular-nums text-foreground'>{value}</span>;
        }
        const [prefix, suffix] = mask.split('{{value}}');
        return (
            <>
                {prefix && <span className='text-muted-foreground'>{prefix}</span>}
                <span className='font-medium tabular-nums text-foreground'>{value}</span>
                {suffix && <span className='text-muted-foreground'>{suffix}</span>}
            </>
        );
    };

    return (
        <div
            className={cn(
                'flex h-9 w-fit items-stretch divide-x divide-input overflow-hidden rounded-md border border-input bg-transparent shadow-xs dark:bg-input/30',
                className,
            )}
            data-block='StepperInput'
        >
            <button
                type='button'
                aria-label='Disminuir'
                disabled={isDecrementDisabled}
                onClick={handleDecrement}
                className='flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5'
            >
                <MinusIcon />
            </button>
            {isEditing ? (
                <input
                    ref={$input}
                    type='number'
                    inputMode='decimal'
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={handleKeyDown}
                    className="min-w-0 flex-1 bg-transparent px-3 text-center text-sm font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
            ) : (
                <button
                    type='button'
                    onClick={startEditing}
                    className='flex flex-1 cursor-text items-center justify-center gap-1 px-3 text-sm whitespace-nowrap transition-colors hover:bg-muted'
                >
                    {renderValue()}
                </button>
            )}
            <button
                type='button'
                aria-label='Aumentar'
                disabled={isIncrementDisabled}
                onClick={handleIncrement}
                className='flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5'
            >
                <PlusIcon />
            </button>
        </div>
    );
};
