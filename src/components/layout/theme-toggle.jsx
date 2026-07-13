'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Sun01Icon, Moon01Icon, LaptopIcon, TickIcon } from '@hugeicons/core-free-icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { SidebarMenuButton } from '@/ui/sidebar';
import { useSettings } from '@/hooks/use-settings';

const THEME_OPTIONS = [
    { value: 'light', label: 'Claro', icon: Sun01Icon },
    { value: 'dark', label: 'Oscuro', icon: Moon01Icon },
    { value: 'system', label: 'Sistema', icon: LaptopIcon },
];

export const ThemeToggle = () => {
    const [theme, setTheme] = useSettings('theme', 'system');
    const current = THEME_OPTIONS.find(option => option.value === theme) ?? THEME_OPTIONS[2];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton />}>
                <HugeiconsIcon icon={current.icon} />
                <span>Apariencia</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side='right' align='end' className='w-48'>
                {THEME_OPTIONS.map(option => (
                    <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
                        <HugeiconsIcon icon={option.icon} />
                        {option.label}
                        {theme === option.value && (
                            <HugeiconsIcon icon={TickIcon} className='ml-auto' />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
