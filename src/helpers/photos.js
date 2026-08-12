// sizeId maps 1:1 to the SIZE_WHITELIST index+1 in the endpoints photo-resize
// proxy (endpoints/src/endpoints/stuffbox/router.js) — keep both in sync.
export const PHOTO_SIZE = {
    LIST: 1, // 48px — list rows, small avatar-style thumbs
    CARD: 2, // 200px — card grid covers, gallery thumbs
    DECK: 3, // 360px — swipeable deck cards
    LIGHTBOX: 4, // 600px — full-view lightbox, crop editor
    ORIGINAL: 'o',
};

const PHOTO_PROXY_URL = process.env.NEXT_PUBLIC_PHOTO_PROXY_URL;

// Must match the proxy's RATIO_WHITELIST — the base sizeId px value times
// this multiplier is what actually gets requested, so a 2x/3x screen still
// gets a crisp image instead of an upscaled 1x one.
const RATIO_WHITELIST = [1, 2, 3];

// SSR-safe (window is undefined during any server render) — devicePixelRatio
// itself is a float (1, 1.5, 2, 2.5...) that never lines up with the proxy's
// integer whitelist, hence the round-then-clamp instead of a direct lookup.
const getPixelRatio = () => {
    if (typeof window === 'undefined') return 1;
    const rounded = Math.round(window.devicePixelRatio || 1);
    return Math.min(Math.max(rounded, RATIO_WHITELIST[0]), RATIO_WHITELIST.at(-1));
};

export const photoUrl = (r2Key, sizeId) =>
    `${PHOTO_PROXY_URL}/stuffbox/photo/${sizeId}/${getPixelRatio()}/${r2Key}`;
