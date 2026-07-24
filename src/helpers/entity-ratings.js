export const getEntityRatingKey = (entityType, entityId) => `${entityType}:${entityId}`;

// Groups a flat entity_ratings list (entityRatingsQuery's shape, profiles
// joined) into per-entity like/dislike buckets — shared by the deck card
// corners, item list row counts, item detail avatars, and the "already
// rated" dialog, so they all agree on what counts as a like vs a dislike.
export const groupRatingsByEntity = (ratings = []) => {
    const byEntity = {};
    for (const rating of ratings) {
        const key = getEntityRatingKey(rating.entity_type, rating.entity_id);
        if (!byEntity[key]) byEntity[key] = { likes: [], dislikes: [] };
        (rating.liked ? byEntity[key].likes : byEntity[key].dislikes).push(rating);
    }
    return byEntity;
};
