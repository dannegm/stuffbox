const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

// OpenRouteService's geocode/autocomplete (Pelias-backed) — direct from the
// client like everything else in this app, no Route Handler needed since ORS
// is designed for a public, client-exposed key.
export const geocodeAutocompleteQuery = (text, opts = {}) => ({
    queryKey: ['geocode-autocomplete', text],
    queryFn: async () => {
        const params = new URLSearchParams({ api_key: ORS_API_KEY, text });
        const response = await fetch(
            `https://api.openrouteservice.org/geocode/autocomplete?${params}`,
        );
        if (!response.ok) throw new Error('No se pudo buscar la dirección');
        const data = await response.json();
        return (data.features ?? []).map(feature => ({
            label: feature.properties.label,
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
        }));
    },
    ...opts,
});
