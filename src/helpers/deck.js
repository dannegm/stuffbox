import { getEntityRatingKey } from '@/helpers/entity-ratings';

// Fisher-Yates — `.sort(() => Math.random() - 0.5)` is a common shortcut but
// doesn't produce a uniform shuffle.
const shuffle = list => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// Priority to whatever the current user hasn't rated yet, without excluding
// what's already rated (by them or anyone else) — otherwise a workspace the
// user has fully rated would leave the deck empty instead of just
// deprioritized, and re-rating (changing a vote) wouldn't be possible.
export const buildDeckQueue = (entities, ratedKeys) => {
    const unrated = [];
    const rated = [];
    for (const entity of entities) {
        const key = getEntityRatingKey(entity.entityType, entity.entityId);
        (ratedKeys.has(key) ? rated : unrated).push(entity);
    }
    return [...shuffle(unrated), ...shuffle(rated)];
};
