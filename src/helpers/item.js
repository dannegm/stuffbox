import { FALLBACK_ITEM_ICON } from '@/constants/location-icons';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

// icon → first tag's icon → generic fallback (no-photo tier of the priority
// chain below).
export const getItemIcon = item =>
    item?.icon ?? item?.item_tags?.[0]?.tags?.icon ?? FALLBACK_ITEM_ICON;

// photo → item.icon → first tag icon → fallback (stuffbox-plan.md §4).
export const getItemPhotoUrl = item => {
    const photos = item?.item_photos ?? [];
    if (photos.length === 0) return null;
    const [first] = [...photos].sort((a, b) => a.order - b.order);
    return `${R2_PUBLIC_URL}/${first.r2_key}`;
};
