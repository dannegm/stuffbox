import { useEffect, useState } from 'react';
import { settings } from '@/services/settings';
import { getByPath } from '@/helpers/objects';

export const useSettings = (path, defaultValue) => {
    const [value, setValue] = useState(() => settings.get(path, defaultValue));

    useEffect(() => {
        return settings.subscribe(next => {
            const resolved = path ? getByPath(next, path) : next;
            setValue(resolved !== undefined ? resolved : defaultValue);
        });
    }, [path, defaultValue]);

    const set = next => {
        const resolved = next instanceof Function ? next(value) : next;
        settings.set(path, resolved);
    };

    return [value, set];
};
