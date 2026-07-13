import QRCode from 'qrcode';

// PNG data url — @react-pdf/renderer's <Image> accepts a data uri directly,
// no upload/round-trip needed (QR generation is 100% client-side).
export const generateQrDataUrl = text => QRCode.toDataURL(text, { margin: 0, width: 400 });
