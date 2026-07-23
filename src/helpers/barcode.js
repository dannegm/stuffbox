// Storage convention for stuffbox.items.sku (plain text, no schema change):
// `${type}|${code}`, e.g. `qr|https://…` or `ean13|0123456789012`. A sku with
// no recognized `type|` prefix is treated as legacy/free-typed plain text.
export const BARCODE_TYPES = [
    { value: 'qr', label: 'QR', zxingFormats: ['QR_CODE'] },
    { value: 'code128', label: 'Code 128', jsBarcodeFormat: 'CODE128', zxingFormats: ['CODE_128'] },
    { value: 'ean13', label: 'EAN-13', jsBarcodeFormat: 'EAN13', zxingFormats: ['EAN_13'] },
    { value: 'ean8', label: 'EAN-8', jsBarcodeFormat: 'EAN8', zxingFormats: ['EAN_8'] },
    { value: 'upc', label: 'UPC-A', jsBarcodeFormat: 'UPC', zxingFormats: ['UPC_A'] },
    { value: 'code39', label: 'Code 39', jsBarcodeFormat: 'CODE39', zxingFormats: ['CODE_39'] },
    { value: 'itf', label: 'ITF', jsBarcodeFormat: 'ITF14', zxingFormats: ['ITF'] },
    { value: 'codabar', label: 'Codabar', jsBarcodeFormat: 'CODABAR', zxingFormats: ['CODABAR'] },
];

export const DEFAULT_BARCODE_TYPE = 'code128';

const ZXING_FORMAT_TO_TYPE = BARCODE_TYPES.reduce((map, type) => {
    (type.zxingFormats ?? []).forEach(format => {
        map[format] = type.value;
    });
    return map;
}, {});

export const getBarcodeType = value => BARCODE_TYPES.find(type => type.value === value) ?? null;

export const getBarcodeTypeFromZxingFormat = format => ZXING_FORMAT_TO_TYPE[format] ?? null;

export const parseSku = sku => {
    const value = sku ?? '';
    const separatorIndex = value.indexOf('|');
    if (separatorIndex === -1) return { type: null, code: value };

    const type = value.slice(0, separatorIndex);
    const code = value.slice(separatorIndex + 1);
    if (!getBarcodeType(type) || !code) return { type: null, code: value };

    return { type, code };
};

export const formatSku = (type, code) => (type && code ? `${type}|${code}` : code);
