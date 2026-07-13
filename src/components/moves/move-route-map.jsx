'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, MapMarker, MarkerContent, MapRoute, MapArc, useMap } from '@/ui/map';
import { MarkerPin } from '@/components/locations/marker-pin';
import { landRouteQuery } from '@/queries/directions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';

const ROUTE_COLOR = '#6366f1';

const FitBounds = ({ points }) => {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded) return;
        const lngs = points.map(point => point[0]);
        const lats = points.map(point => point[1]);
        map.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 64, duration: 0 },
        );
    }, [map, isLoaded, points]);

    return null;
};

// Route geometry is never stored (stuffbox-plan.md §4) — land routes are
// fetched live from ORS on each render; air routes are a decorative arc
// (MapArc's own bezier, not a true geodesic — good enough at this scale).
export const MoveRouteMap = ({ origin, destination, routeType }) => {
    const resolvedTheme = useResolvedTheme();
    const { data: routeCoordinates } = useQuery(
        landRouteQuery(
            { origin: { lat: origin.lat, lng: origin.lng }, destination },
            { enabled: routeType === 'land' },
        ),
    );

    const center = {
        center: [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2],
        zoom: 4,
    };

    return (
        <div className='h-64 w-full overflow-hidden rounded-lg border' data-block='MoveRouteMap'>
            <Map viewport={center} attributionControl={false} theme={resolvedTheme}>
                <FitBounds
                    points={[
                        [origin.lng, origin.lat],
                        [destination.lng, destination.lat],
                    ]}
                />
                <MapMarker longitude={origin.lng} latitude={origin.lat}>
                    <MarkerContent>
                        <MarkerPin color='bg-primary' />
                    </MarkerContent>
                </MapMarker>
                <MapMarker longitude={destination.lng} latitude={destination.lat}>
                    <MarkerContent>
                        <MarkerPin color='bg-foreground' pulse={false} />
                    </MarkerContent>
                </MapMarker>
                {routeType === 'land' && routeCoordinates && (
                    <MapRoute coordinates={routeCoordinates} color={ROUTE_COLOR} />
                )}
                {routeType === 'air' && (
                    <MapArc
                        data={[
                            {
                                id: 'route',
                                from: [origin.lng, origin.lat],
                                to: [destination.lng, destination.lat],
                            },
                        ]}
                        paint={{ 'line-color': ROUTE_COLOR, 'line-dasharray': [2, 1.5] }}
                    />
                )}
            </Map>
        </div>
    );
};
