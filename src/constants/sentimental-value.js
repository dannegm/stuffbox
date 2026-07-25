export const SENTIMENTAL_VALUE_LABELS = {
    1: 'Algo importante',
    2: 'Con cariño',
    3: 'Significado especial',
    4: 'Muy valioso',
    5: 'Irremplazable',
};

export const getSentimentalValueLabel = value => SENTIMENTAL_VALUE_LABELS[value] ?? 'Sin valor';
