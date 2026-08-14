'use client';

import { useState } from 'react';
import { SortAscendingIcon, SortDescendingIcon, CheckIcon } from '@phosphor-icons/react/ssr';
import { SORT_FIELDS } from '@/helpers/sort';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuTrigger,
    ResponsiveDropdownMenuSeparator,
} from '@/ui/responsive-dropdown-menu';
import { Button } from '@/ui/button';
import { cn } from '@/helpers/utils';

const SORT_DIRECTIONS = [
    { value: 'asc', label: 'Ascendente', icon: SortAscendingIcon },
    { value: 'desc', label: 'Descendente', icon: SortDescendingIcon },
];

const SORT_ROW_CLASS =
    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none hover:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

// Plain button, not a ResponsiveDropdownMenuItem — that one always closes
// the menu/drawer on click (DrawerClose on mobile has no opt-out), which is
// wrong here: picking a field or direction should only stage it, not commit
// it. Only the Aplicar button below actually calls `onSortChange` + closes.
const SortRow = ({ selected, onClick, children }) => (
    <button
        type='button'
        onClick={onClick}
        className={cn(SORT_ROW_CLASS, selected && 'bg-muted font-medium')}
    >
        {children}
    </button>
);

// Icon-only trigger (icon itself flips to reflect the current *applied*
// direction) for the field+direction sort menu shared by every locations/
// items list in the app (location/[id] and move/[id]) — same `{ field,
// direction }` shape everywhere, just fed different `sort`/`onSortChange`
// per list. `fields` defaults to the app-wide SORT_FIELDS list but can be
// overridden per caller (e.g. move/[id] adding a "packed at" option that
// doesn't make sense outside a move context). Selection is staged in
// `pendingSort` while the menu is open and only committed via Aplicar —
// dismissing the menu/drawer any other way (outside click, escape) discards
// it, since `onSortChange` is never called.
export const SortMenuButton = ({ sort, onSortChange, fields = SORT_FIELDS }) => {
    const [open, setOpen] = useState(false);
    const [pendingSort, setPendingSort] = useState(sort);

    const handleOpenChange = nextOpen => {
        if (nextOpen) setPendingSort(sort);
        setOpen(nextOpen);
    };

    const handleApply = () => {
        onSortChange(pendingSort);
        setOpen(false);
    };

    return (
        <ResponsiveDropdownMenu open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDropdownMenuTrigger
                render={<Button size='icon-sm' variant='outline' aria-label='Ordenar' />}
            >
                {sort.direction === 'asc' ? <SortAscendingIcon /> : <SortDescendingIcon />}
            </ResponsiveDropdownMenuTrigger>
            <ResponsiveDropdownMenuContent align='end' className='flex flex-col gap-1'>
                {fields.map(option => (
                    <SortRow
                        key={option.value}
                        selected={option.value === pendingSort.field}
                        onClick={() =>
                            setPendingSort(current => ({ ...current, field: option.value }))
                        }
                    >
                        <span className='flex-1'>{option.label}</span>
                        {option.value === pendingSort.field && <CheckIcon />}
                    </SortRow>
                ))}
                <ResponsiveDropdownMenuSeparator />
                {SORT_DIRECTIONS.map(direction => (
                    <SortRow
                        key={direction.value}
                        selected={direction.value === pendingSort.direction}
                        onClick={() =>
                            setPendingSort(current => ({ ...current, direction: direction.value }))
                        }
                    >
                        <direction.icon />
                        <span className='flex-1'>{direction.label}</span>
                        {direction.value === pendingSort.direction && <CheckIcon />}
                    </SortRow>
                ))}
                <ResponsiveDropdownMenuSeparator />
                <Button size='sm' onClick={handleApply}>
                    Aplicar
                </Button>
            </ResponsiveDropdownMenuContent>
        </ResponsiveDropdownMenu>
    );
};
