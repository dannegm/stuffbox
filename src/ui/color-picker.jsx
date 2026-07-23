'use client';

import { useEffect, useState } from 'react';
import {
    ResponsivePopover,
    ResponsivePopoverContent,
    ResponsivePopoverTrigger,
} from '@/ui/responsive-popover';
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
        <ResponsivePopover>
            <ResponsivePopoverTrigger render={children} />
            <ResponsivePopoverContent className='w-54'>
                <ColorSelector value={localColor} onChange={handleChange} />
            </ResponsivePopoverContent>
        </ResponsivePopover>
    );
};
