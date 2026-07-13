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
            <TabsList className='w-full bg-sidebar-accent/70'>
                {THEME_OPTIONS.map(option => (
                    <Tooltip key={option.value}>
                        <TooltipTrigger
                            render={
                                <TabsTrigger
                                    value={option.value}
                                    className='text-sidebar-foreground/60 hover:text-sidebar-foreground data-active:bg-sidebar data-active:text-sidebar-foreground'
                                />
                            }
                        >
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
