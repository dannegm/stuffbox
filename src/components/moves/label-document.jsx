'use client';

import { Document, Page, View, Text, Image, Svg, Path, StyleSheet } from '@react-pdf/renderer';

const CELLS_PER_PAGE = 6;

const styles = StyleSheet.create({
    page: {
        paddingVertical: '13.5mm',
        paddingHorizontal: '15mm',
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
    },
    cell: {
        width: '90mm',
        height: '90mm',
        padding: '4mm',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '0.5pt solid #cccccc',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '3mm',
    },
    qr: {
        width: '40mm',
        height: '40mm',
    },
    textCol: {
        flex: 1,
    },
    name: {
        fontSize: 12,
        fontWeight: 700,
        color: '#000000',
    },
    summary: {
        fontSize: 8,
        color: '#333333',
        marginTop: '2mm',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: '3mm',
    },
    icon: {
        width: '8mm',
        height: '8mm',
    },
});

// Hand-drawn — react-pdf can't render Phosphor/DOM icon components, only its
// own Svg/Path primitives.
const FragileIcon = () => (
    <Svg viewBox='0 0 24 24' style={styles.icon}>
        <Path d='M12 2L1 21h22L12 2z' fill='#dc2626' />
    </Svg>
);

// Always shown, per the label spec — a generic "this side up" convention,
// not tied to the item/box's own configured storage_orientation value.
const UpIcon = () => (
    <Svg viewBox='0 0 24 24' style={styles.icon}>
        <Path d='M12 2L4 12h5v10h6V12h5L12 2z' fill='#000000' />
    </Svg>
);

const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
};

const Label = ({ label }) => (
    <View style={styles.cell} wrap={false}>
        <View style={styles.topRow}>
            <Image src={label.qrDataUrl} style={styles.qr} />
            <View style={styles.textCol}>
                <Text style={styles.name}>{label.name}</Text>
                {label.summary && <Text style={styles.summary}>{label.summary}</Text>}
            </View>
        </View>
        <View style={styles.bottomRow}>
            {label.isFragile && <FragileIcon />}
            <UpIcon />
        </View>
    </View>
);

// One multi-page A4 doc, 2x3 grid (~90x90mm cells) — stuffbox-plan.md §8.
// `labels` items need { id, name, qrDataUrl, summary, isFragile } already
// resolved (QR generation is async, so it happens in the builder before this
// renders — see move/[id]/labels/page.js).
export const LabelDocument = ({ labels }) => {
    const pages = chunk(labels, CELLS_PER_PAGE);
    return (
        <Document>
            {pages.map((pageLabels, pageIndex) => (
                <Page key={pageIndex} size='A4' style={styles.page}>
                    {pageLabels.map(label => (
                        <Label key={label.id} label={label} />
                    ))}
                </Page>
            ))}
        </Document>
    );
};
