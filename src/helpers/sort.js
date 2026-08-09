export const SORT_FIELDS = [
    { value: 'name', label: 'Alfanumérica' },
    { value: 'created_at', label: 'Fecha de creación' },
    { value: 'count', label: 'Cantidad de elementos' },
    { value: 'price', label: 'Valor monetario' },
    { value: 'likes', label: 'Likes' },
];

// Liked beats disliked beats neither — used by `likes` sorting below, and
// exported so callers can compute the same rank for display if needed.
export const getLikeRank = (likeCount, dislikeCount) => {
    if (likeCount > 0) return 2;
    if (dislikeCount > 0) return 1;
    return 0;
};

// `getValue(entity)` resolves the field's raw comparable (string or number)
// for one entity — callers own that mapping since locations and items don't
// share a shape. Every field sorts ascending-by-value under 'asc' except
// `likes`: the product spec defines its asc/desc as categorical groupings
// (asc = liked, disliked, none) rather than a scalar direction, which is the
// reverse of what sorting ascending-by-rank would give — special-cased here
// instead of forcing the caller's `getValue` to fake it.
export const sortEntities = (entities, field, direction, getValue) => {
    const sorted = [...entities].sort((a, b) => {
        const valueA = getValue(a);
        const valueB = getValue(b);
        if (typeof valueA === 'string') return valueA.localeCompare(valueB, 'es');
        return (valueA ?? 0) - (valueB ?? 0);
    });
    if (field === 'likes') return direction === 'asc' ? sorted.reverse() : sorted;
    return direction === 'desc' ? sorted.reverse() : sorted;
};
