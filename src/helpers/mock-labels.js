import { fakerES_MX as faker } from '@faker-js/faker';
import { generateQrDataUrl } from '@/helpers/qr';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIENTATIONS = ['NONE', 'UP', 'DOWN', 'LEFT', 'RIGHT'];

// Roughly matches a real move's mix (items outnumber boxed locations); only
// locations get a summary — items never carry an ai_summary in the real
// schema (see move/[id]/labels/page.js's handleGeneratePdf).
const buildMockLabel = index => {
    const kind = faker.helpers.weightedArrayElement([
        { value: 'item', weight: 6 },
        { value: 'location', weight: 4 },
    ]);
    const isItem = kind === 'item';
    return {
        kind,
        id: `mock-${kind}-${index}`,
        name: isItem ? faker.commerce.productName() : `Caja — ${faker.commerce.department()}`,
        isFragile: faker.datatype.boolean({ probability: 0.35 }),
        summary: isItem ? null : faker.lorem.sentences({ min: 1, max: 2 }),
        orientation: faker.helpers.arrayElement(ORIENTATIONS),
    };
};

// LabelDocument-ready mocks, QR already resolved (QR generation is async).
export const buildMockLabels = async count => {
    const mocks = Array.from({ length: count }, (_, index) => buildMockLabel(index));
    return Promise.all(
        mocks.map(async mock => ({
            id: mock.id,
            name: mock.name,
            isFragile: mock.isFragile,
            summary: mock.summary,
            orientation: mock.orientation,
            qrDataUrl: await generateQrDataUrl(
                `${APP_URL}/${mock.kind === 'item' ? 'i' : 'l'}/${mock.id}`,
            ),
        })),
    );
};
