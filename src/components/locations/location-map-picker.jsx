'use client';

import { useEffect } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/ui/map';
import { DEFAULT_VIEWPORT, FOCUS_ZOOM, MAP_STYLES } from '@/constants/map-defaults';
import { cn } from '@/helpers/utils';

const ClickToPlace = ({ onChange }) => {
    const { map } = useMap();

    useEffect(() => {
        if (!map) return;
        const handleClick = event => onChange({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        map.on('click', handleClick);
        return () => map.off('click', handleClick);
    }, [map, onChange]);

    return null;
};

const MarkerPin = () => (
    <div className='size-4 rounded-full border-2 border-white bg-primary shadow-lg shadow-black/20' />
);

// Click to drop a pin, drag to adjust, or "usar mi ubicación" — no address
// search yet (that needs a geocoding call, out of scope for now).
export const LocationMapPicker = ({ value, onChange, className }) => {
    const hasValue = value?.lat != null && value?.lng != null;
    const initialViewport = hasValue
        ? { center: [value.lng, value.lat], zoom: FOCUS_ZOOM }
        : DEFAULT_VIEWPORT;

    return (
        <div
            className={cn('h-64 w-full overflow-hidden rounded-lg border', className)}
            data-block='LocationMapPicker'
        >
            <Map styles={MAP_STYLES} viewport={initialViewport}>
                <ClickToPlace onChange={onChange} />
                {hasValue && (
                    <MapMarker
                        longitude={value.lng}
                        latitude={value.lat}
                        draggable
                        onDragEnd={onChange}
                    >
                        <MarkerContent>
                            <MarkerPin />
                        </MarkerContent>
                    </MapMarker>
                )}
                <MapControls
                    showZoom
                    showLocate
                    onLocate={coords => onChange({ lat: coords.latitude, lng: coords.longitude })}
                />
            </Map>
        </div>
    );
};
