'use client';

import { Document, Page, View, Text, Image, Svg, Path, StyleSheet } from '@react-pdf/renderer';

const MM_PER_IN = 25.4;
const LETTER_WIDTH_MM = 215.9;
const LETTER_HEIGHT_MM = 279.4;

// Defaults match a real 4x2in label sheet, Letter size, 2 columns x 5 rows —
// stuffbox-plan.md §8. Callers can override any of these to fit a different
// sheet without touching the layout math below.
const DEFAULT_BOX_WIDTH_MM = 4 * MM_PER_IN; // 101.6mm
const DEFAULT_BOX_HEIGHT_MM = 2 * MM_PER_IN; // 50.8mm
const DEFAULT_MARGIN_VERTICAL_MM = 12.7;
const DEFAULT_MARGIN_HORIZONTAL_MM = 5;
const DEFAULT_TAGS_PER_PAGE = 10;

// The printable content area inset from each box's die-cut edge — fixed,
// not exposed as a prop (nothing so far has asked to tune it).
const CONTENT_INSET_MM = 5;

// Matches storage_orientation's fixed enum (see provision-account.js) —
// degrees to rotate the arrow so it still reads as "this side up" pointing
// the right way. UP is the icon's native drawn direction, hence 0.
const ORIENTATION_ROTATION = { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 };

// Bottom margin mirrors top, right margin mirrors left — the grid always
// sits symmetrically inset from the page. Columns/rows are however many
// boxes fit in that inset area; gaps are whatever's left over, split evenly
// space-between style (flush against the margins, space only between
// boxes) so the grid always spans edge-to-edge with no extra centering step.
const buildGrid = ({ boxWidthMm, boxHeightMm, marginVerticalMm, marginHorizontalMm, tagsPerPage }) => {
    const availableWidthMm = LETTER_WIDTH_MM - 2 * marginHorizontalMm;
    const availableHeightMm = LETTER_HEIGHT_MM - 2 * marginVerticalMm;

    const columns = Math.max(1, Math.floor(availableWidthMm / boxWidthMm));
    const rows = Math.max(1, Math.ceil(tagsPerPage / columns));

    const columnGapMm =
        columns > 1 ? (availableWidthMm - columns * boxWidthMm) / (columns - 1) : 0;
    const rowGapMm = rows > 1 ? (availableHeightMm - rows * boxHeightMm) / (rows - 1) : 0;

    return { columns, rows, columnGapMm, rowGapMm };
};

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
    },
    outerCell: {},
    outerCellDebug: {
        border: '0.5pt dashed #aaaaaa',
    },
    cell: {
        margin: `${CONTENT_INSET_MM}mm`,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '5mm',
    },
    qr: {
        width: '20mm',
        height: '20mm',
    },
    textCol: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontWeight: 700,
        color: '#000000',
    },
    summary: {
        fontSize: 10,
        color: '#333333',
        marginTop: '1.5mm',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: '2.5mm',
        paddingTop: '2mm',
        borderTopWidth: '0.5pt',
        borderTopColor: '#dddddd',
    },
    icon: {
        width: '6mm',
        height: '6mm',
    },
    fragileText: {
        fontSize: 16,
        fontWeight: 700,
        color: '#dc2626',
    },
    orientationGroup: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '1mm',
        marginLeft: 'auto',
    },
    orientationLabel: {
        fontSize: 6,
        fontWeight: 700,
        color: '#000000',
    },
    orientationIcons: {
        flexDirection: 'row',
        gap: '1.5mm',
    },
    emptyPage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    emptyText: {
        fontSize: 14,
        color: '#999999',
    },
});

// Hand-drawn — react-pdf can't render Phosphor/DOM icon components, only its
// own Svg/Path primitives.
const FragileIcon = () => (
    <Svg viewBox='0 0 24 24' style={styles.icon}>
        <Path d='M12 2L1 21h22L12 2z' fill='#dc2626' />
    </Svg>
);

// Rotated per label.storage_orientation (UP/RIGHT/DOWN/LEFT) — only the
// arrow itself rotates, not the "ESTE LADO ARRIBA" caption around it.
const UpIcon = ({ rotation = 0 }) => (
    <Svg viewBox='0 0 24 24' style={[styles.icon, { transform: `rotate(${rotation}deg)` }]}>
        <Path d='M12 2L4 12h6v10h4V12h6L12 2z' fill='#000000' />
    </Svg>
);

const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
};

// react-pdf's <Text> has no line-clamp/numberOfLines — approximate a line
// cap with a character budget instead, sized to the default textCol width
// (box width minus content inset, qr, and gap) at each field's font size.
const NAME_MAX_CHARS = 32; // ~2 lines at fontSize 14
const SUMMARY_MAX_CHARS = 80; // ~3 lines at fontSize 10

const truncateText = (text, maxChars) => {
    if (!text || text.length <= maxChars) return text;
    return `${text.slice(0, maxChars - 1).trimEnd()}…`;
};

// Sheet still has `tagsPerPage` die-cut boxes regardless of how many labels
// we have — an empty outerCell keeps the cut lines/positions matching the
// physical sheet instead of leaving unprinted (and therefore unusable) blanks.
const EmptyLabel = ({ boxStyle }) => <View style={boxStyle} wrap={false} />;

const Label = ({ label, boxStyle, cellStyle }) => (
    <View style={boxStyle} wrap={false}>
        <View style={cellStyle}>
            <View style={styles.topRow}>
                <Image src={label.qrDataUrl} style={styles.qr} />
                <View style={styles.textCol}>
                    <Text style={styles.name}>{truncateText(label.name, NAME_MAX_CHARS)}</Text>
                    {label.summary && (
                        <Text style={styles.summary}>
                            {truncateText(label.summary, SUMMARY_MAX_CHARS)}
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.bottomRow}>
                {label.isFragile && (
                    <>
                        <FragileIcon />
                        <Text style={styles.fragileText}>FRÁGIL</Text>
                    </>
                )}
                {label.orientation && label.orientation !== 'NONE' && (
                    <View style={styles.orientationGroup}>
                        <Text style={styles.orientationLabel}>ESTE LADO ARRIBA</Text>
                        <View style={styles.orientationIcons}>
                            <UpIcon rotation={ORIENTATION_ROTATION[label.orientation] ?? 0} />
                            <UpIcon rotation={ORIENTATION_ROTATION[label.orientation] ?? 0} />
                        </View>
                    </View>
                )}
            </View>
        </View>
    </View>
);

// One multi-page Letter doc, grid of `boxWidthMm`x`boxHeightMm` label boxes
// (defaults: 4x2in, 2 columns x 5 rows = 10 per page) — stuffbox-plan.md §8.
// The grid is inset from the page by `marginVerticalMm`/`marginHorizontalMm`
// (bottom mirrors top, right mirrors left); columns/rows are derived from how many
// boxes of that size fit in the inset area, and the gaps between them are
// whatever's left over, split evenly (space-between: flush against the
// margins, space only between boxes — see `buildGrid`).
// `labels` items need { id, name, qrDataUrl, summary, isFragile, orientation }
// already resolved (QR generation is async, so it happens in the builder
// before this renders — see move/[id]/labels/page.js). `orientation` is the
// storage_orientation enum (NONE/UP/DOWN/LEFT/RIGHT) — null/undefined/NONE
// hides the arrow entirely. `labels` missing/empty renders a single
// placeholder page instead of a blank zero-page PDF. Any page with fewer
// than `tagsPerPage` real labels (only ever the last one) is padded out with
// empty boxes so every printed sheet always has all die-cut positions filled.
// `debug` shows the dashed die-cut outline for previewing the grid — off by
// default since a real print run has no printed cut lines (the sheet's own
// die cut is the boundary); the admin labels-preview route turns it on.
export const LabelDocument = ({
    labels,
    boxWidthMm = DEFAULT_BOX_WIDTH_MM,
    boxHeightMm = DEFAULT_BOX_HEIGHT_MM,
    marginVerticalMm = DEFAULT_MARGIN_VERTICAL_MM,
    marginHorizontalMm = DEFAULT_MARGIN_HORIZONTAL_MM,
    tagsPerPage = DEFAULT_TAGS_PER_PAGE,
    debug = false,
}) => {
    if (!labels || labels.length === 0) {
        return (
            <Document>
                <Page size='LETTER' style={styles.emptyPage}>
                    <Text style={styles.emptyText}>No hay etiquetas para mostrar</Text>
                </Page>
            </Document>
        );
    }

    const { columnGapMm, rowGapMm } = buildGrid({
        boxWidthMm,
        boxHeightMm,
        marginVerticalMm,
        marginHorizontalMm,
        tagsPerPage,
    });

    const pageStyle = [
        styles.page,
        {
            paddingVertical: `${marginVerticalMm}mm`,
            paddingHorizontal: `${marginHorizontalMm}mm`,
            rowGap: `${rowGapMm}mm`,
            columnGap: `${columnGapMm}mm`,
        },
    ];
    const boxStyle = [
        styles.outerCell,
        debug ? styles.outerCellDebug : null,
        { width: `${boxWidthMm}mm`, height: `${boxHeightMm}mm` },
    ].filter(Boolean);
    const cellStyle = [
        styles.cell,
        {
            width: `${boxWidthMm - 2 * CONTENT_INSET_MM}mm`,
            height: `${boxHeightMm - 2 * CONTENT_INSET_MM}mm`,
        },
    ];

    const pages = chunk(labels, tagsPerPage);
    return (
        <Document>
            {pages.map((pageLabels, pageIndex) => (
                <Page key={pageIndex} size='LETTER' style={pageStyle}>
                    {pageLabels.map(label => (
                        <Label key={label.id} label={label} boxStyle={boxStyle} cellStyle={cellStyle} />
                    ))}
                    {Array.from({ length: tagsPerPage - pageLabels.length }, (_, i) => (
                        <EmptyLabel key={`empty-${i}`} boxStyle={boxStyle} />
                    ))}
                </Page>
            ))}
        </Document>
    );
};
