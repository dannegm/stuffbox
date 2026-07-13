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

// Mirrors getItemPhotoUrl (src/helpers/item.js) — first photo, by order.
export const getLocationPhotoUrl = location => {
    const photos = location?.location_photos ?? [];
    if (photos.length === 0) return null;
    const [first] = [...photos].sort((a, b) => a.order - b.order);
    return `${R2_PUBLIC_URL}/${first.r2_key}`;
};
