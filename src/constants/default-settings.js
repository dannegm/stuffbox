// Grows as features need local settings — nothing is pre-declared beyond
// what's actually in use. Keys are flat (no nesting) since useSettings()
// paths are dot-notation and these don't need grouping yet.
export const defaultSettings = {
    theme: 'system', // 'system' | 'light' | 'dark'
    debug: false,
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
};
