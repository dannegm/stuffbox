'use client';

import { useEffect, useState } from 'react';
import { parseUA } from '@/helpers/ua-parser';

// Chrome on Android doesn't reliably surface a "take photo" shortcut in the
// native file picker without a dedicated capture=environment input — unlike
// iOS Safari, which shows one from a plain accept='image/*' input. False
// during SSR/before mount (navigator isn't available server-side), same
// pattern as useIsMobile (src/hooks/use-mobile.js).
export const useIsAndroid = () => {
    const [isAndroid, setIsAndroid] = useState(false);

    useEffect(() => {
        setIsAndroid(parseUA(navigator.userAgent).os === 'android');
    }, []);

    return isAndroid;
};
