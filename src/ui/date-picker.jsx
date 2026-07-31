'use client';

import { useState } from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, XIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
import { Calendar } from '@/ui/calendar';
import { Button } from '@/ui/button';
import { cn } from '@/helpers/utils';

const DATE_FORMAT = 'yyyy-MM-dd';
const parseDate = value => (value ? parse(value, DATE_FORMAT, new Date()) : undefined);

// value/onChange are plain "yyyy-MM-dd" strings — the same shape Postgres
// `date` columns round-trip as — never raw Date objects, so this drops
// straight into forms that otherwise use a native <Input type='date'>.
// Desktop gets a floating Popover, mobile falls back to a Drawer, same as
// every other picker in the app (ResponsivePopover).
export const DatePicker = ({
    id,
    value,
    onChange,
    placeholder = 'Elegir fecha',
    min,
    max,
    clearable = false,
    className,
}) => {
    const [open, setOpen] = useState(false);
    const selected = parseDate(value);
    const minDate = parseDate(min);
    const maxDate = parseDate(max);

    const handleSelect = date => {
        onChange(date ? format(date, DATE_FORMAT) : '');
        setOpen(false);
    };

    return (
        <div className='flex items-center gap-1.5'>
            <ResponsivePopover open={open} onOpenChange={setOpen}>
                <ResponsivePopoverTrigger
                    render={
                        <Button
                            id={id}
                            type='button'
                            variant='outline'
                            data-empty={!selected}
                            className={cn(
                                'flex-1 justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
                                className,
                            )}
                        />
                    }
                >
                    <CalendarIcon data-icon='inline-start' />
                    {selected ? format(selected, 'PPP', { locale: es }) : <span>{placeholder}</span>}
                </ResponsivePopoverTrigger>
                <ResponsivePopoverContent className='w-auto p-0' align='start'>
                    <Calendar
                        mode='single'
                        locale={es}
                        selected={selected}
                        onSelect={handleSelect}
                        disabled={
                            min || max
                                ? date =>
                                      (minDate && date < minDate) || (maxDate && date > maxDate)
                                : undefined
                        }
                    />
                </ResponsivePopoverContent>
            </ResponsivePopover>
            {clearable && selected && (
                <Button
                    type='button'
                    size='icon-sm'
                    variant='outline'
                    onClick={() => onChange('')}
                >
                    <XIcon />
                </Button>
            )}
        </div>
    );
};
