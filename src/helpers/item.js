import { FALLBACK_ITEM_ICON } from '@/constants/location-icons';
import { photoUrl } from '@/helpers/photos';

// icon → first tag's icon → generic fallback (no-photo tier of the priority
// chain below).
export const getItemIcon = item =>
    item?.icon ?? item?.item_tags?.[0]?.tags?.icon ?? FALLBACK_ITEM_ICON;

// The raw first-by-order photo row (crop_x/crop_y/zoom included) — needed
// wherever a thumbnail has to respect the saved crop (CroppedPhoto,
// src/ui/cropped-photo.jsx), not just its url.
export const getFirstItemPhoto = item => {
    const photos = item?.item_photos ?? [];
    if (photos.length === 0) return null;
    const [first] = [...photos].sort((a, b) => a.order - b.order);
    return first;
};

// photo → item.icon → first tag icon → fallback (stuffbox-plan.md §4).
// `sizeId` (PHOTO_SIZE, src/helpers/photos.js) is required — callers pick it
// based on where the url is actually rendered.
export const getItemPhotoUrl = (item, sizeId) => {
    const photo = getFirstItemPhoto(item);
    return photo ? photoUrl(photo.r2_key, sizeId) : null;
};

// All photos sorted by order, pre-resolved to `{ src, photo }` — feeds
// PhotoLightbox when it needs every photo, not just the cover.
export const getItemPhotos = (item, sizeId) => {
    const photos = item?.item_photos ?? [];
    return [...photos]
        .sort((a, b) => a.order - b.order)
        .map(photo => ({ src: photoUrl(photo.r2_key, sizeId), photo }));
};
