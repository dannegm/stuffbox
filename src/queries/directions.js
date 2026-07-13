const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

// Land route line for the move map — ORS directions, driving profile (moves
// are house-to-house/warehouse, not foot/bike routes). Geometry is never
// stored (stuffbox-plan.md §4), just computed live for display.
export const landRouteQuery = ({ origin, destination }, opts = {}) => ({
    queryKey: ['land-route', origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: async () => {
        const response = await fetch(
            'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
            {
                method: 'POST',
                headers: {
                    Authorization: ORS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coordinates: [
                        [origin.lng, origin.lat],
                        [destination.lng, destination.lat],
                    ],
                }),
            },
        );
        if (!response.ok) throw new Error('No se pudo calcular la ruta');
        const data = await response.json();
        return data.features[0].geometry.coordinates;
    },
    enabled: !!origin?.lat && !!origin?.lng && !!destination?.lat && !!destination?.lng,
    ...opts,
});
