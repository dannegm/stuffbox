'use client';

import { useEffect, useState } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/ui/map';
import { AddressSearch } from '@/components/locations/address-search';
import { MarkerPin } from '@/components/locations/marker-pin';
import { FOCUS_ZOOM } from '@/constants/map-defaults';
import { useSettings } from '@/hooks/use-settings';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { cn } from '@/helpers/utils';

const CDMX_VIEWPORT = { center: [-99.1332, 19.4326], zoom: 14 };

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

// Map is uncontrolled after mount (see LocationMapPicker), so an address
// search selection can't just update `viewport` — it needs to imperatively
// fly the camera. `target` is a fresh object per selection so the effect
// re-fires even when the coordinates happen to repeat.
const FlyTo = ({ target }) => {
    const { map } = useMap();

    useEffect(() => {
        if (!map || !target) return;
        map.flyTo({ center: [target.lng, target.lat], zoom: FOCUS_ZOOM, duration: 1200 });
    }, [map, target]);

    return null;
};

// Search an address (autocomplete), click to drop a pin, drag to adjust, or
// "usar mi ubicación".
export const LocationMapPicker = ({ value, onChange, className }) => {
    const [mapDefaultViewport] = useSettings('mapDefaultViewport', CDMX_VIEWPORT);
    const resolvedTheme = useResolvedTheme();
    const [flyTarget, setFlyTarget] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const hasValue = value?.lat != null && value?.lng != null;
    const initialViewport = hasValue
        ? { center: [value.lng, value.lat], zoom: FOCUS_ZOOM }
        : mapDefaultViewport;

    const handleSearchSelect = coords => {
        onChange(coords);
        setFlyTarget(coords);
    };

    // Always show a draggable pin — defaulting to the viewport's own center
    // when there's no value yet — instead of requiring a first click just to
    // make the marker appear.
    const markerPosition = hasValue
        ? { lat: value.lat, lng: value.lng }
        : { lat: mapDefaultViewport.center[1], lng: mapDefaultViewport.center[0] };

    return (
        <div
            className={cn('h-64 w-full overflow-hidden rounded-lg border', className)}
            data-block='LocationMapPicker'
        >
            <Map viewport={initialViewport} attributionControl={false} theme={resolvedTheme}>
                <ClickToPlace onChange={onChange} />
                <FlyTo target={flyTarget} />
                <MapMarker
                    longitude={markerPosition.lng}
                    latitude={markerPosition.lat}
                    draggable
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={coords => {
                        setIsDragging(false);
                        onChange(coords);
                    }}
                >
                    <MarkerContent>
                        <MarkerPin lifted={isDragging} />
                    </MarkerContent>
                </MapMarker>
                <MapControls
                    position='bottom-left'
                    showZoom
                    showLocate
                    onLocate={coords => onChange({ lat: coords.latitude, lng: coords.longitude })}
                />
                <AddressSearch
                    onSelect={handleSearchSelect}
                    className='absolute top-2 right-2 left-2 z-20'
                />
            </Map>
        </div>
    );
};
