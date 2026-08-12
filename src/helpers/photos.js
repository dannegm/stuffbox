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

export const photoUrl = (r2Key, sizeId) => `${PHOTO_PROXY_URL}/stuffbox/photo/${sizeId}/${r2Key}`;
