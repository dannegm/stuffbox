'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { HOUSE_ICON_CHOICES } from '@/constants/location-icons';
import { cn } from '@/helpers/utils';

// Curated set (not a full searchable library) — enough to give a house its
// own look without building a 13k-icon search UI today.
export const HouseIconPicker = ({ value, onChange, children }) => (
    <Popover>
        <PopoverTrigger render={children} />
        <PopoverContent className='w-64'>
            <div className='grid grid-cols-5 gap-1'>
                {HOUSE_ICON_CHOICES.map(icon => (
                    <button
                        key={icon.name}
                        type='button'
                        onClick={() => onChange(icon)}
                        aria-label={icon.name}
                        className={cn(
                            "flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted [&_svg:not([class*='size-'])]:size-4",
                            value?.name === icon.name &&
                                'bg-primary/10 text-primary ring-1 ring-primary/30',
                        )}
                    >
                        <DynamicIcon icon={icon} />
                    </button>
                ))}
            </div>
        </PopoverContent>
    </Popover>
);
