'use client';

import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { ColorSelector } from '@/ui/color-selector';

export const ColorPicker = ({ value, onChange, children }) => {
    const [localColor, setLocalColor] = useState(value || '#6366f1');

    useEffect(() => {
        if (value) setLocalColor(value);
    }, [value]);

    const handleChange = hex => {
        setLocalColor(hex);
        onChange?.(hex);
    };

    return (
        <Popover>
            <PopoverTrigger render={children} />
            <PopoverContent className='w-54'>
                <ColorSelector value={localColor} onChange={handleChange} />
            </PopoverContent>
        </Popover>
    );
};
