const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

// No specific location to default to (personal households are anywhere) —
// a broad low-zoom view plus the map's own "usar mi ubicación" control lets
// people jump straight to their real position instead of guessing a city.
export const DEFAULT_VIEWPORT = {
    center: [0, 20],
    zoom: 1.5,
};

export const FOCUS_ZOOM = 16;

export const MAP_STYLES = {
    light: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
    dark: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
};
