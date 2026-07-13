'use client';

import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

// Resolves the local `theme` setting ('system' | 'light' | 'dark', via
// useResolvedTheme) to the shadcn-standard .dark class on <html> — 'system'
// tracks the OS preference live via matchMedia, no polling. Also mirrors a
// .light class (unused by our own CSS, which only keys off .dark) so
// anything doing its own document-class theme detection — e.g. mapcn's Map
// component when no explicit `theme` prop is passed — resolves the app's
// actual theme instead of falling back to raw OS preference.
export const ThemeProvider = ({ children }) => {
    const resolvedTheme = useResolvedTheme();

    useEffect(() => {
        const isDark = resolvedTheme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.classList.toggle('light', !isDark);
    }, [resolvedTheme]);

    return children;
};
