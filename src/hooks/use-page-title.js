'use client';

import { useEffect } from 'react';

const APP_NAME = 'Stuffbox';

export const usePageTitle = (parts) => {
    const segments = (Array.isArray(parts) ? parts : [parts]).filter(Boolean);
    const title = [...segments, APP_NAME].join(' | ');

    useEffect(() => {
        document.title = title;
    }, [title]);
};
