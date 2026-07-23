import { parseSku } from '@/helpers/barcode';

// Matches this app's own printed-label QR payloads — a full URL whose path
// is `/i/{id}` or `/l/{id}` (see move/[id]/labels/page.js, which builds
// exactly that, and the /i/[id], /l/[id] redirect routes that consume it).
// A real retail barcode or a manually-typed sku simply won't match this.
const DEEP_LINK_PATH = /^\/(i|l)\/([A-Za-z0-9_-]{8})$/;

export const matchDeepLink = value => {
    // ScanSkuDialog always hands callers a `type|code`-formatted string (see
    // helpers/barcode.js's formatSku) — a scanned label QR arrives as
    // `qr|https://.../i/{id}`, not the bare URL, so the type prefix has to
    // come off before this can parse as a URL at all.
    const { code } = parseSku(value);

    let pathname;
    try {
        pathname = new URL(code).pathname;
    } catch {
        return null;
    }

    const match = DEEP_LINK_PATH.exec(pathname);
    if (!match) return null;

    const [, segment, id] = match;
    return { kind: segment === 'i' ? 'item' : 'location', id };
};
