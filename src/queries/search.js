import { supabase } from '@/services/supabase';

export const SEARCH_PAGE_SIZE = 25;

// Same select shapes as itemsAtLocationQuery/locationChildrenQuery — search
// results carry the exact same fields (photos, tags, quantity, type, etc.)
// as their native list views, not a stripped-down shape.
const ITEM_SELECT =
    'id, name, quantity, icon, active_move_id, item_photos(r2_key, order, crop_x, crop_y, zoom, rotation, flip_x, flip_y), item_tags(tags(icon))';
const LOCATION_SELECT =
    '*, location_photos(r2_key, order, crop_x, crop_y, zoom, rotation, flip_x, flip_y)';

const fetchSearchPage = async ({ workspaceId, q, tagIds, typeIds, packed, houseIds, offset }) => {
    // The RPC only resolves which (kind, id) pairs match, in order, plus
    // the shared total — it needs real SQL (cross-table union + a
    // recursive ancestor walk for the house filter). Full row data comes
    // from two plain direct-client selects below, keyed off those ids.
    const { data: matches, error } = await supabase().rpc('search_workspace', {
        p_workspace_id: workspaceId,
        p_query: q.trim() || null,
        p_tag_ids: tagIds.length > 0 ? tagIds : null,
        p_type_ids: typeIds.length > 0 ? typeIds : null,
        p_packed: packed,
        p_house_ids: houseIds.length > 0 ? houseIds : null,
        p_limit: SEARCH_PAGE_SIZE,
        p_offset: offset,
    });
    if (error) throw error;

    const safeMatches = matches ?? [];
    const total = safeMatches[0]?.total_count ?? 0;
    const itemIds = safeMatches.filter(match => match.kind === 'item').map(match => match.id);
    const locationIds = safeMatches
        .filter(match => match.kind === 'location')
        .map(match => match.id);

    const [itemsRes, locationsRes] = await Promise.all([
        itemIds.length > 0
            ? supabase().from('items').select(ITEM_SELECT).in('id', itemIds)
            : Promise.resolve({ data: [], error: null }),
        locationIds.length > 0
            ? supabase().from('locations').select(LOCATION_SELECT).in('id', locationIds)
            : Promise.resolve({ data: [], error: null }),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    if (locationsRes.error) throw locationsRes.error;

    const itemsById = Object.fromEntries(itemsRes.data.map(row => [row.id, row]));
    const locationsById = Object.fromEntries(locationsRes.data.map(row => [row.id, row]));

    // Re-attach full row data in the RPC's original (name-sorted) order —
    // `.in()` doesn't preserve it. Drops any id whose row vanished
    // between the two calls (deleted mid-search) instead of rendering a
    // blank row for it.
    const rows = safeMatches
        .map(match => ({
            kind: match.kind,
            data: match.kind === 'item' ? itemsById[match.id] : locationsById[match.id],
        }))
        .filter(row => row.data);

    return { rows, total };
};

// Real offset-based pages via useInfiniteQuery, so "cargar más" appends a
// distinct page instead of re-fetching a bigger growing window — each
// already-rendered page stays put (and its query result stays cached) while
// only the new page is fetched. Changing any filter changes the queryKey, so
// TanStack Query starts a fresh cache entry (and page 1) automatically —
// no manual reset needed.
export const searchQuery = (
    { workspaceId, q = '', tagIds = [], typeIds = [], packed = null, houseIds = [] },
    opts = {},
) => ({
    queryKey: ['search', workspaceId, q, tagIds, typeIds, packed, houseIds],
    queryFn: ({ pageParam }) =>
        fetchSearchPage({ workspaceId, q, tagIds, typeIds, packed, houseIds, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, page) => sum + page.rows.length, 0);
        return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!workspaceId,
    ...opts,
});
