// Grows as features need local settings — nothing is pre-declared beyond
// what's actually in use. useSettings() paths are dot-notation, so a key can
// be flat or a nested object grouping a feature's settings (e.g. `ai` below).
export const defaultSettings = {
    theme: 'system', // 'system' | 'light' | 'dark'
    debug: false,
    // location/[id] children+items display mode — sticks across the whole app
    // until the user flips it again, not per-location.
    locationViewType: 'list', // 'list' | 'cards'
    // location/[id] mobile Ubicaciones/Artículos tab — null lets the page keep
    // defaulting to whichever has content until the user taps a tab, at which
    // point that choice sticks everywhere.
    locationMobileTab: null, // 'locations' | 'items' | null
    // location/[id] sort menus (SortMenuButton) — global, not per-location,
    // same "sticks until changed" behavior as locationViewType above.
    locationSort: { field: 'name', direction: 'asc' },
    itemSort: { field: 'name', direction: 'asc' },
    // Where LocationMapPicker (src/components/locations/location-map-picker.jsx)
    // centers on first open, before the user clicks/drags/locates — CDMX.
    mapDefaultViewport: { center: [-99.1332, 19.4326], zoom: 14 },
    // Bring-your-own-key AI config (src/services/ai.js, profile page) — never
    // synced to the DB, lives in this browser only. `keys` is per-provider so
    // switching providers doesn't discard a token entered for another one.
    ai: {
        provider: 'openrouter',
        model: '',
        keys: {},
    },
    // src/components/debug/breakpoint-indicator.jsx, configured on
    // /admin/settings — off by default, ported from ../aura.
    debugTools: {
        breakpointIndicator: {
            enabled: false,
            position: 'bottom-right', // see BREAKPOINT_INDICATOR_POSITIONS
        },
    },
};
