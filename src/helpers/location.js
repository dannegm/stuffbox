import { DEFAULT_LOCATION_ICONS, FALLBACK_LOCATION_ICON } from '@/constants/location-icons';

export const getLocationIcon = location =>
    location?.icon ??
    DEFAULT_LOCATION_ICONS[location?.type?.toLowerCase()] ??
    FALLBACK_LOCATION_ICON;
