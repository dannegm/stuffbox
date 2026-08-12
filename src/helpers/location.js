import {
    DEFAULT_LOCATION_ICONS,
    FALLBACK_LOCATION_ICON,
    CONTAINER_TYPES,
} from '@/constants/location-icons';
import { photoUrl } from '@/helpers/photos';

export const getLocationIcon = location =>
    location?.icon ??
    DEFAULT_LOCATION_ICONS[location?.type?.toLowerCase()] ??
    FALLBACK_LOCATION_ICON;

export const isContainerType = type => CONTAINER_TYPES.includes(type?.toLowerCase());

// Mirrors getFirstItemPhoto (src/helpers/item.js) — first photo, by order,
// crop_x/crop_y/zoom included.
export const getFirstLocationPhoto = location => {
    const photos = location?.location_photos ?? [];
    if (photos.length === 0) return null;
    const [first] = [...photos].sort((a, b) => a.order - b.order);
    return first;
};

// `sizeId` (PHOTO_SIZE, src/helpers/photos.js) is required — callers pick it
// based on where the url is actually rendered.
export const getLocationPhotoUrl = (location, sizeId) => {
    const photo = getFirstLocationPhoto(location);
    return photo ? photoUrl(photo.r2_key, sizeId) : null;
};

// Mirrors getItemPhotos (src/helpers/item.js) — every photo, sorted and
// pre-resolved to `{ src, photo }`, for PhotoLightbox.
export const getLocationPhotos = (location, sizeId) => {
    const photos = location?.location_photos ?? [];
    return [...photos]
        .sort((a, b) => a.order - b.order)
        .map(photo => ({ src: photoUrl(photo.r2_key, sizeId), photo }));
};
