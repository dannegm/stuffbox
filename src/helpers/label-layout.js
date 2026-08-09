export const MM_PER_IN = 25.4;
export const LETTER_WIDTH_MM = 215.9;
export const LETTER_HEIGHT_MM = 279.4;

// Defaults match a real 4x2in label sheet, Letter size, 2 columns x 5 rows —
// stuffbox-plan.md §8. Persisted per-workspace under the `labelLayoutSettings`
// key (see src/queries/workspace-settings.js) using this exact shape, so a
// missing/unset setting can fall back to these directly.
export const DEFAULT_LABEL_LAYOUT = {
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
    boxWidthMm,
    boxHeightMm,
    marginVerticalMm,
    marginHorizontalMm,
    tagsPerPage,
}) => {
    const availableWidthMm = LETTER_WIDTH_MM - 2 * marginHorizontalMm;
    const availableHeightMm = LETTER_HEIGHT_MM - 2 * marginVerticalMm;

    const columns = Math.max(1, Math.floor(availableWidthMm / boxWidthMm));
    const rows = Math.max(1, Math.ceil(tagsPerPage / columns));

    const columnGapMm =
        columns > 1 ? (availableWidthMm - columns * boxWidthMm) / (columns - 1) : 0;
    const rowGapMm = rows > 1 ? (availableHeightMm - rows * boxHeightMm) / (rows - 1) : 0;

    return { columns, rows, columnGapMm, rowGapMm };
};
