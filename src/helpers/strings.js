export const trim = (str, char = ' ') => {
    let start = 0;
    let end = str.length;
    while (start < end && str[start] === char) start++;
    while (end > start && str[end - 1] === char) end--;
    return str.slice(start, end);
};

const COMBINING_MARK_RANGE = [0x0300, 0x036f];

// Lowercase + strip diacritics (NFD splits accented chars into base + a
// combining mark codepoint, which we then drop) so search matches regardless
// of accents/tildes, e.g. normalizeText('música') === normalizeText('musica').
export const normalizeText = str =>
    Array.from(str.normalize('NFD'))
        .filter(char => {
            const code = char.codePointAt(0);
            return code < COMBINING_MARK_RANGE[0] || code > COMBINING_MARK_RANGE[1];
        })
        .join('')
        .toLowerCase();
