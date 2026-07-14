import {
    DEFAULT_LOCATION_ICONS,
    FALLBACK_LOCATION_ICON,
    CONTAINER_TYPES,
} from '@/constants/location-icons';

export const getLocationIcon = location =>
    location?.icon ??
    DEFAULT_LOCATION_ICONS[location?.type?.toLowerCase()] ??
    FALLBACK_LOCATION_ICON;

export const isContainerType = type => CONTAINER_TYPES.includes(type?.toLowerCase());

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

// Mirrors getFirstItemPhoto (src/helpers/item.js) — first photo, by order,
// crop_x/crop_y/zoom included.
export const getFirstLocationPhoto = location => {
    const photos = location?.location_photos ?? [];
    if (photos.length === 0) return null;
    const [first] = [...photos].sort((a, b) => a.order - b.order);
    return first;
};

export const getLocationPhotoUrl = location => {
    const photo = getFirstLocationPhoto(location);
    return photo ? `${R2_PUBLIC_URL}/${photo.r2_key}` : null;
};
