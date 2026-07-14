import { ItemListRow } from '@/components/items/item-list-row';
import { LocationListItem } from '@/components/locations/location-list-item';

// Thin dispatcher on `kind` — reuses the exact same row components as the
// item/location list views (photos, tag-icon fallback, packed tape,
// quantity) instead of a separate reduced-data row shape.
export const SearchResultRow = ({ result }) =>
    result.kind === 'item' ? (
        <ItemListRow item={result.data} />
    ) : (
        <LocationListItem location={result.data} />
    );
