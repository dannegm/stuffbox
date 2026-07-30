import Fuse from 'fuse.js';
import { normalizeText } from '@/helpers/strings';

// Wraps fuse.js with accent-insensitive matching ("musica" finds "música")
// on top of its built-in typo tolerance. Fuse itself has no accent-folding,
// so each searched field gets a shadow `__norm_*` copy normalized the same
// way as the query, and only those shadow fields are searched.
export const fuzzySearch = (list, query, keys, options = {}) => {
    const q = normalizeText(query ?? '').trim();
    if (!q) return list;

    const normalizedList = list.map(item => {
        const shadow = { __ref: item };
        keys.forEach(key => {
            const value = item[key];
            shadow[key] = Array.isArray(value)
                ? value.map(entry => normalizeText(String(entry)))
                : normalizeText(String(value ?? ''));
        });
        return shadow;
    });

    const fuse = new Fuse(normalizedList, {
        includeScore: false,
        threshold: 0.35,
        ignoreLocation: true,
        ...options,
        keys,
    });

    return fuse.search(q).map(result => result.item.__ref);
};
