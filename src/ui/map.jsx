'use client';

import MapLibreGL from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, MinusIcon, NavigationArrowIcon, SpinnerIcon } from '@phosphor-icons/react/ssr';

import { cn } from '@/helpers/utils';

// Trimmed port of pinia's src/ui/map.jsx — only what a single-point picker
// needs (Map, MapMarker, MapControls zoom+locate). Port MapRoute/MapArc/
// MapPopup/etc from pinia the same way once Moves needs route rendering.

function getDocumentTheme() {
    if (typeof document === 'undefined') return null;
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return 'light';
}

function useResolvedTheme(themeProp) {
    const [detectedTheme, setDetectedTheme] = useState(() => themeProp ?? getDocumentTheme());

    useEffect(() => {
        if (themeProp) return;
        const observer = new MutationObserver(() => setDetectedTheme(getDocumentTheme()));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
        return () => observer.disconnect();
    }, [themeProp]);

    return themeProp ?? detectedTheme;
}

const MapContext = createContext(null);

function useMap() {
    const context = useContext(MapContext);
    if (!context) throw new Error('useMap must be used within a Map component');
    return context;
}

function DefaultLoader() {
    return (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-xs'>
            <SpinnerIcon weight='bold' className='size-5 animate-spin text-muted-foreground' />
        </div>
    );
}

function getViewport(map) {
    const center = map.getCenter();
    return { center: [center.lng, center.lat], zoom: map.getZoom() };
}

const Map = forwardRef(function Map(
    {
        children,
        className,
        theme: themeProp,
        styles,
        viewport,
        onViewportChange,
        loading = false,
        ...props
    },
    ref,
) {
    const containerRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const currentStyleRef = useRef(null);
    const internalUpdateRef = useRef(false);
    const resolvedTheme = useResolvedTheme(themeProp);

    const isControlled = viewport !== undefined && onViewportChange !== undefined;

    const onViewportChangeRef = useRef(onViewportChange);
    onViewportChangeRef.current = onViewportChange;

    useImperativeHandle(ref, () => mapInstance, [mapInstance]);

    useEffect(() => {
        if (!containerRef.current) return;

        const initialStyle = resolvedTheme === 'dark' ? styles.dark : styles.light;
        currentStyleRef.current = initialStyle;

        const map = new MapLibreGL.Map({
            container: containerRef.current,
            style: initialStyle,
            renderWorldCopies: false,
            attributionControl: { compact: true },
            ...props,
            ...viewport,
        });

        const loadHandler = () => setIsLoaded(true);
        const handleMove = () => {
            if (internalUpdateRef.current) return;
            onViewportChangeRef.current?.(getViewport(map));
        };

        map.on('load', loadHandler);
        map.on('move', handleMove);
        setMapInstance(map);

        return () => {
            map.off('load', loadHandler);
            map.off('move', handleMove);
            map.remove();
            setIsLoaded(false);
            setMapInstance(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!mapInstance || !isControlled || !viewport) return;
        if (mapInstance.isMoving()) return;

        const current = getViewport(mapInstance);
        const next = {
            center: viewport.center ?? current.center,
            zoom: viewport.zoom ?? current.zoom,
        };
        if (
            next.center[0] === current.center[0] &&
            next.center[1] === current.center[1] &&
            next.zoom === current.zoom
        ) {
            return;
        }

        internalUpdateRef.current = true;
        mapInstance.jumpTo(next);
        internalUpdateRef.current = false;
    }, [mapInstance, isControlled, viewport]);

    useEffect(() => {
        if (!mapInstance || !resolvedTheme) return;
        const newStyle = resolvedTheme === 'dark' ? styles.dark : styles.light;
        if (currentStyleRef.current === newStyle) return;
        currentStyleRef.current = newStyle;
        mapInstance.setStyle(newStyle, { diff: false });
    }, [mapInstance, resolvedTheme, styles]);

    const contextValue = useMemo(
        () => ({ map: mapInstance, isLoaded, resolvedTheme }),
        [mapInstance, isLoaded, resolvedTheme],
    );

    return (
        <MapContext.Provider value={contextValue}>
            <div ref={containerRef} className={cn('relative h-full w-full', className)}>
                {(!isLoaded || loading) && <DefaultLoader />}
                {mapInstance && children}
            </div>
        </MapContext.Provider>
    );
});

const MarkerContext = createContext(null);

function useMarkerContext() {
    const context = useContext(MarkerContext);
    if (!context) throw new Error('Marker components must be used within MapMarker');
    return context;
}

function MapMarker({
    longitude,
    latitude,
    children,
    onDragEnd,
    draggable = false,
    ...markerOptions
}) {
    const { map } = useMap();

    const callbacksRef = useRef({ onDragEnd });
    callbacksRef.current = { onDragEnd };

    const marker = useMemo(() => {
        const markerInstance = new MapLibreGL.Marker({
            ...markerOptions,
            element: document.createElement('div'),
            draggable,
        }).setLngLat([longitude, latitude]);

        const handleDragEnd = () => {
            const lngLat = markerInstance.getLngLat();
            callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
        };
        markerInstance.on('dragend', handleDragEnd);

        return markerInstance;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!map) return;
        marker.addTo(map);
        return () => marker.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    useEffect(() => {
        const current = marker.getLngLat();
        if (current.lng !== longitude || current.lat !== latitude) {
            marker.setLngLat([longitude, latitude]);
        }
        if (marker.isDraggable() !== draggable) {
            marker.setDraggable(draggable);
        }
    }, [marker, longitude, latitude, draggable]);

    return <MarkerContext.Provider value={{ marker, map }}>{children}</MarkerContext.Provider>;
}

function MarkerContent({ children, className }) {
    const { marker } = useMarkerContext();
    return createPortal(
        <div className={cn('relative', draggableCursor(marker), className)}>{children}</div>,
        marker.getElement(),
    );
}

function draggableCursor(marker) {
    return marker.isDraggable() ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer';
}

const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
};

function ControlGroup({ children }) {
    return (
        <div className='flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-md shadow-black/10 [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border'>
            {children}
        </div>
    );
}

function ControlButton({ onClick, label, children, disabled = false }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            type='button'
            disabled={disabled}
            className='flex size-9 items-center justify-center text-foreground/70 transition-all first:rounded-t-lg last:rounded-b-lg hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
        >
            {children}
        </button>
    );
}

function MapControls({
    position = 'bottom-right',
    showZoom = true,
    showLocate = false,
    className,
    onLocate,
}) {
    const { map } = useMap();
    const [waitingForLocation, setWaitingForLocation] = useState(false);

    const handleZoomIn = useCallback(
        () => map?.zoomTo(map.getZoom() + 1, { duration: 300 }),
        [map],
    );
    const handleZoomOut = useCallback(
        () => map?.zoomTo(map.getZoom() - 1, { duration: 300 }),
        [map],
    );

    const handleLocate = useCallback(() => {
        if (!('geolocation' in navigator)) return;
        setWaitingForLocation(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                const coords = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
                map?.flyTo({
                    center: [coords.longitude, coords.latitude],
                    zoom: 16,
                    duration: 1500,
                });
                onLocate?.(coords);
                setWaitingForLocation(false);
            },
            () => setWaitingForLocation(false),
        );
    }, [map, onLocate]);

    return (
        <div
            className={cn(
                'absolute z-10 flex flex-col gap-1.5',
                positionClasses[position],
                className,
            )}
        >
            {showZoom && (
                <ControlGroup>
                    <ControlButton onClick={handleZoomIn} label='Acercar'>
                        <PlusIcon className='size-4' />
                    </ControlButton>
                    <ControlButton onClick={handleZoomOut} label='Alejar'>
                        <MinusIcon className='size-4' />
                    </ControlButton>
                </ControlGroup>
            )}
            {showLocate && (
                <ControlGroup>
                    <ControlButton
                        onClick={handleLocate}
                        label='Usar mi ubicación'
                        disabled={waitingForLocation}
                    >
                        {waitingForLocation ? (
                            <SpinnerIcon weight='bold' className='size-4 animate-spin' />
                        ) : (
                            <NavigationArrowIcon className='size-4' />
                        )}
                    </ControlButton>
                </ControlGroup>
            )}
        </div>
    );
}

export { Map, useMap, MapMarker, MarkerContent, MapControls };
