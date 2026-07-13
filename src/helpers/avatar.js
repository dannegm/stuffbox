import { createAvatar } from '@dicebear/core';
import * as micah from '@dicebear/micah';

// micah's own default palette (from its schema) for hair/facial-hair color —
// reused here (not invented) so the picked color still looks native to the style.
const HAIR_COLORS = [
    'f9c9b6',
    'd2eff3',
    '000000',
    'e0ddff',
    'f4d150',
    'ac6651',
    '9287ff',
    'ffeba4',
    'fc909f',
    'ffedef',
    '6bd9e9',
    '77311d',
    'ffffff',
];

// micah has no built-in gender axis, so this leans on what each hairstyle is
// named after (best effort, not visually confirmed — swap entries between
// the two lists if one reads wrong once you see it rendered).
const HAIR_BY_GENDER = {
    male: ['fonze', 'mrT', 'dougFunny', 'mrClean', 'dannyPhantom'],
    female: ['full', 'pixie', 'turban'],
};

// eyebrows is also where micah draws eyelashes — 'eyelashesUp'/'eyelashesDown'
// are eyebrow+eyelash combo variants, 'up'/'down' have no eyelashes.
const EYEBROWS_BY_GENDER = {
    male: ['up', 'down'],
    female: ['eyelashesUp', 'eyelashesDown'],
};

// Deterministic per-seed pick — Math.random() here would re-roll the hair
// color on every render instead of keeping it stable for a given seed.
const pickBySeed = (seed, options) => {
    const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
    return options[hash % options.length];
};

export const getAvatarUrl = (seed, gender) => {
    if (!seed) return '';

    const hairColor = pickBySeed(seed, HAIR_COLORS);

    return createAvatar(micah, {
        seed,
        hair: HAIR_BY_GENDER[gender] ?? HAIR_BY_GENDER.male,
        eyebrows: EYEBROWS_BY_GENDER[gender] ?? EYEBROWS_BY_GENDER.male,
        earringsProbability: gender === 'female' ? 30 : 0,
        facialHairProbability: gender === 'male' ? 40 : 0,
        // Single-value arrays force that exact color — facial hair matches
        // the hair color instead of picking its own independently.
        hairColor: [hairColor],
        facialHairColor: [hairColor],
    }).toDataUri();
};
