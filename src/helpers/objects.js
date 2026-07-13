import { trim } from './strings';

export const setByPath = (obj, path, value) => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return result;
};

export const getByPath = (objectToBrowse, path) => {
    if (!path || path === '.') return objectToBrowse;
    const trimmedPath = trim(path, '.');
    const keys = trimmedPath.split('.');
    return keys.reduce((nestedObject, currentKey) => nestedObject?.[currentKey], objectToBrowse);
};
