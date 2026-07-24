export const SENTIMENTAL_VALUE_LABELS = {
    1: 'Puede ser importante',
    2: 'Le tengo cariño',
    3: 'Tiene un significado especial',
    4: 'Muy valioso para mí',
    5: 'Irremplazable',
};

export const getSentimentalValueLabel = value =>
    SENTIMENTAL_VALUE_LABELS[value] ?? 'Sin valor sentimental';
