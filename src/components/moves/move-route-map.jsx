'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TruckIcon, AirplaneTiltIcon, CrosshairIcon } from '@phosphor-icons/react/ssr';
import { Map, MapMarker, MarkerContent, MapRoute, MapArc, useMap } from '@/ui/map';
import { MoveRouteMarker } from '@/components/moves/move-route-marker';
import { DirectionArrow } from '@/components/moves/direction-arrow';
import { landRouteQuery } from '@/queries/directions';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { getLocationIcon } from '@/helpers/location';
import { Button } from '@/ui/button';

// Route color and mid-route vehicle marker both key off the move's status —
// gray while still planning, blue once in transit (with a truck/plane
// marker at the route midpoint), green once done.
const ROUTE_COLOR_BY_STATUS = {
    planning: '#64748b',
    in_transit: '#3b82f6',
    done: '#22c55e',
};

const ORIGIN_COLOR = '#3b82f6';
const DESTINATION_COLOR = '#22c55e';

const FIT_BOUNDS_PADDING = 32;
const MARKER_CLICK_ZOOM = 14;

const fitToPoints = (map, points, duration = 0) => {
    const lngs = points.map(point => point[0]);
    const lats = points.map(point => point[1]);
    map.fitBounds(
        [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: FIT_BOUNDS_PADDING, duration },
    );
};

const FitBounds = ({ points }) => {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded) return;
        fitToPoints(map, points);
    }, [map, isLoaded, points]);

    return null;
};

// Re-runs the same fitBounds the map does on load, for whenever dragging or
// zooming has drifted the route out of frame.
const RecenterButton = ({ points }) => {
    const { map } = useMap();

    return (
        <Button
            type='button'
            size='icon-sm'
            variant='outline'
            aria-label='Centrar ruta'
            className='absolute right-2 bottom-2 z-10 bg-background'
            onClick={() => map && fitToPoints(map, points, 400)}
        >
            <CrosshairIcon />
        </Button>
    );
};

// MoveRouteMap renders <Map> itself, so its own body isn't inside the map
// context — this wraps a marker in a component that is, purely so its
// onClick can flyTo (per MapMarker's own click-handler wiring in ui/map.jsx).
const FlyToMarker = ({ longitude, latitude, children }) => {
    const { map } = useMap();

    return (
        <MapMarker
            longitude={longitude}
            latitude={latitude}
            onClick={() =>
                map?.flyTo({
                    center: [longitude, latitude],
                    zoom: MARKER_CLICK_ZOOM,
                    duration: 800,
                })
            }
        >
            {children}
        </MapMarker>
    );
};

// Route geometry is never stored (stuffbox-plan.md §4) — land routes are
// fetched live from ORS on each render; air routes are a decorative arc
// (MapArc's own bezier, not a true geodesic — good enough at this scale).
export const MoveRouteMap = ({ origin, destination, routeType, status = 'planning' }) => {
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

    const routeColor = ROUTE_COLOR_BY_STATUS[status] ?? ROUTE_COLOR_BY_STATUS.planning;

    const routePoints = [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
    ];

    const midpoint =
        routeType === 'land' && routeCoordinates?.length > 0
            ? routeCoordinates[Math.floor(routeCoordinates.length / 2)]
            : [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2];

    return (
        <div className='h-64 w-full overflow-hidden rounded-lg border' data-block='MoveRouteMap'>
            <Map viewport={center} attributionControl={false} theme={resolvedTheme}>
                <FitBounds points={routePoints} />
                <RecenterButton points={routePoints} />
                <FlyToMarker longitude={origin.lng} latitude={origin.lat}>
                    <MarkerContent>
                        <MoveRouteMarker icon={getLocationIcon(origin)} variant='origin' />
                    </MarkerContent>
                </FlyToMarker>
                <FlyToMarker longitude={destination.lng} latitude={destination.lat}>
                    <MarkerContent>
                        <MoveRouteMarker
                            icon={getLocationIcon(destination)}
                            variant='destination'
                        />
                    </MarkerContent>
                </FlyToMarker>
                <DirectionArrow
                    coords={{ lat: origin.lat, lng: origin.lng }}
                    color={ORIGIN_COLOR}
                    flyToZoom={MARKER_CLICK_ZOOM}
                />
                <DirectionArrow
                    coords={{ lat: destination.lat, lng: destination.lng }}
                    color={DESTINATION_COLOR}
                    flyToZoom={MARKER_CLICK_ZOOM}
                />
                {status === 'in_transit' && (
                    <MapMarker longitude={midpoint[0]} latitude={midpoint[1]}>
                        <MarkerContent>
                            <div className='relative flex size-7 items-center justify-center'>
                                <div className='absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 animate-radar-ping rounded-full border-2 border-blue-500 bg-blue-500/10' />
                                <div className='relative z-10 flex size-7 items-center justify-center rounded-full border-2 border-background bg-blue-500 text-background shadow-md shadow-black/30 [&_svg]:size-3.5'>
                                    {routeType === 'air' ? <AirplaneTiltIcon /> : <TruckIcon />}
                                </div>
                            </div>
                        </MarkerContent>
                    </MapMarker>
                )}
                {routeType === 'land' && routeCoordinates && (
                    <MapRoute coordinates={routeCoordinates} color={routeColor} />
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
                        paint={{ 'line-color': routeColor, 'line-dasharray': [2, 1.5] }}
                    />
                )}
            </Map>
        </div>
    );
};
