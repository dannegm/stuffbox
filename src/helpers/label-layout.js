export const MM_PER_IN = 25.4;
export const LETTER_WIDTH_MM = 215.9;
export const LETTER_HEIGHT_MM = 279.4;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Keyed on react-pdf's own named `<Page size>` values, so `pageSize` from
// layout settings can be passed straight through to LabelDocument with no
// translation step.
export const PAGE_SIZES = {
    LETTER: { widthMm: LETTER_WIDTH_MM, heightMm: LETTER_HEIGHT_MM, label: 'Carta' },
    A4: { widthMm: A4_WIDTH_MM, heightMm: A4_HEIGHT_MM, label: 'A4' },
};

// Defaults match a real 4x2in label sheet, Letter size, 2 columns x 5 rows —
// stuffbox-plan.md §8. Persisted per-workspace under the `labelLayoutSettings`
// key (see src/queries/workspace-settings.js) using this exact shape, so a
// missing/unset setting can fall back to these directly.
export const DEFAULT_LABEL_LAYOUT = {
    pageSize: 'LETTER',
    boxWidthMm: 4 * MM_PER_IN, // 101.6mm
    boxHeightMm: 2 * MM_PER_IN, // 50.8mm
    marginVerticalMm: 12.7,
    marginHorizontalMm: 5,
    tagsPerPage: 10,
};

// Bottom margin mirrors top, right margin mirrors left — the grid always
// sits symmetrically inset from the page. Columns/rows are however many
// boxes fit in that inset area; gaps are whatever's left over, split evenly
// space-between style (flush against the margins, space only between
// boxes) so the grid always spans edge-to-edge with no extra centering step.
export const buildLabelGrid = ({
    pageSize = DEFAULT_LABEL_LAYOUT.pageSize,
    boxWidthMm,
    boxHeightMm,
    marginVerticalMm,
    marginHorizontalMm,
    tagsPerPage,
}) => {
    const { widthMm: pageWidthMm, heightMm: pageHeightMm } =
        PAGE_SIZES[pageSize] ?? PAGE_SIZES.LETTER;
    const availableWidthMm = pageWidthMm - 2 * marginHorizontalMm;
    const availableHeightMm = pageHeightMm - 2 * marginVerticalMm;

    const columns = Math.max(1, Math.floor(availableWidthMm / boxWidthMm));
    const rows = Math.max(1, Math.ceil(tagsPerPage / columns));

    const columnGapMm =
        columns > 1 ? (availableWidthMm - columns * boxWidthMm) / (columns - 1) : 0;
    const rowGapMm = rows > 1 ? (availableHeightMm - rows * boxHeightMm) / (rows - 1) : 0;

    return { columns, rows, columnGapMm, rowGapMm };
};
