import Color from 'color';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

export const generateName = () =>
    uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: '-',
        style: 'lowerCase',
    });

// Single color (unlike bins' colorDark/colorLight split) — stuffbox's profiles
// table has one `color` column; contrast is resolved in the UI, not baked in.
export const generateColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return Color.hsl(hue, 70, 55).hex();
};

export const generateGender = () => (Math.random() < 0.5 ? 'male' : 'female');
