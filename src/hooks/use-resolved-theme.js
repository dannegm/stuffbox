import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';

// Resolves the local `theme` setting ('system' | 'light' | 'dark') to a
// concrete 'light' | 'dark', live. For anything that needs the app's actual
// theme as a value rather than sniffing document classes — that sniffing
// races on first mount (the class isn't applied yet when the sniffing
// component's own effect first runs), which is why the map showed the wrong
// basemap until a manual theme toggle forced a correction.
export const useResolvedTheme = () => {
    const [theme] = useSettings('theme', 'system');
    const [systemPrefersDark, setSystemPrefersDark] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches,
    );

    useEffect(() => {
        if (theme !== 'system') return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => setSystemPrefersDark(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [theme]);

    const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);
    return isDark ? 'dark' : 'light';
};
