'use client';

import { useEffect } from 'react';
import { useSettings } from '@/hooks/use-settings';

// Local setting, not tied to any workspace/user DB row. Mirrors `debug` onto
// <html data-debug> so src/css/variants.css's `debug:` variant and
// src/css/debug.css's outline rule can both key off it.
// No visual overlay yet (pinia's center crosshair was for its map pin editor,
// which doesn't apply here) — stuffbox's own debug affordance is TBD.
export const DebugProvider = ({ children }) => {
    const [debug] = useSettings('debug', false);

    useEffect(() => {
        document.documentElement.setAttribute('data-debug', debug);
    }, [debug]);

    return children;
};
