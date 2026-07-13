'use client';

import { SunIcon, MoonIcon, LaptopIcon } from '@phosphor-icons/react/ssr';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { useSettings } from '@/hooks/use-settings';

const THEME_OPTIONS = [
    { value: 'light', label: 'Claro', icon: SunIcon },
    { value: 'dark', label: 'Oscuro', icon: MoonIcon },
    { value: 'system', label: 'Sistema', icon: LaptopIcon },
];

export const ThemeToggle = () => {
    const [theme, setTheme] = useSettings('theme', 'system');

    return (
        <Tabs value={theme} onValueChange={setTheme} data-block='ThemeToggle'>
            <TabsList className='w-full'>
                {THEME_OPTIONS.map(option => (
                    <Tooltip key={option.value}>
                        <TooltipTrigger render={<TabsTrigger value={option.value} />}>
                            <option.icon />
                            <span className='sr-only'>{option.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side='top'>{option.label}</TooltipContent>
                    </Tooltip>
                ))}
            </TabsList>
        </Tabs>
    );
};
