'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { VideoCameraIcon, CaretDownIcon } from '@phosphor-icons/react/ssr';
import { FieldError } from '@/ui/field';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/ui/dropdown-menu';
import { getBarcodeTypeFromZxingFormat, formatSku, DEFAULT_BARCODE_TYPE } from '@/helpers/barcode';

const getCameraLabel = (device, index) => {
    const label = device.label.toLowerCase();
    if (/back|rear|environment/.test(label)) return 'Trasera';
    if (/front|user|face/.test(label)) return 'Frontal';
    return `Cámara ${index + 1}`;
};

// Own <video> + ZXing continuous decode instead of a library-owned widget
// (html5-qrcode-style), so the camera view sits inside our own
// ResponsiveDialog and matches the rest of the app's dialog language.
export const ScanSkuDialog = ({ open, onOpenChange, onScan }) => {
    const $video = useRef(null);
    // React's Strict Mode double-invokes this effect in dev (mount → cleanup
    // → mount again), so two decodeFromVideoDevice sessions can end up racing
    // to attach to the same <video> element. ZXing's stop() unconditionally
    // nulls out videoElement.srcObject regardless of which session owns it
    // (see @zxing/browser's cleanVideoSource), so an earlier session's
    // belated stop() can wipe out the still-live session's feed — camera
    // hardware stays on, but the tag goes black forever. Chaining every
    // setup/teardown onto this ref serializes them so a stop() always
    // finishes before the next session opens the camera.
    const $session = useRef(Promise.resolve(null));
    const [error, setError] = useState(null);
    const [focusPoint, setFocusPoint] = useState(null);
    const [devices, setDevices] = useState([]);
    // What the user explicitly picked (drives the effect below — null means
    // "let the browser choose", i.e. facingMode: 'environment').
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    // Which device is actually running, read back from the live stream —
    // kept separate from selectedDeviceId so resolving it doesn't itself
    // trigger a restart, it's purely for highlighting the right tab.
    const [activeDeviceId, setActiveDeviceId] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        let cancelled = false;

        $session.current = $session.current.then(async () => {
            if (cancelled) return null;
            try {
                const controls = await new BrowserMultiFormatReader().decodeFromVideoDevice(
                    selectedDeviceId ?? undefined,
                    $video.current,
                    (result, err) => {
                        if (cancelled) return;
                        if (result) {
                            const type = getBarcodeTypeFromZxingFormat(result.getBarcodeFormat());
                            onScan(formatSku(type ?? DEFAULT_BARCODE_TYPE, result.getText()));
                            onOpenChange(false);
                            return;
                        }
                        if (err && !(err instanceof NotFoundException)) setError(err.message);
                    },
                );
                if (!cancelled) {
                    const settings = $video.current?.srcObject?.getVideoTracks?.()[0]?.getSettings?.();
                    if (settings?.deviceId) setActiveDeviceId(settings.deviceId);
                    // Only listable with real labels once permission is
                    // granted — decodeFromVideoDevice just resolved, so
                    // that's guaranteed true here. Listing on dialog-open
                    // instead (before the getUserMedia prompt resolves, on a
                    // first-ever grant) used to come back blank and never
                    // get retried, so the switcher only appeared on a second
                    // open of the dialog.
                    BrowserMultiFormatReader.listVideoInputDevices()
                        .then(list => {
                            if (!cancelled) setDevices(list);
                        })
                        .catch(() => {});
                }
                return controls;
            } catch (err) {
                if (!cancelled) setError(err.message);
                return null;
            }
        });

        return () => {
            cancelled = true;
            $session.current = $session.current.then(controls => {
                controls?.stop();
                return null;
            });
        };
    }, [open, selectedDeviceId, onScan, onOpenChange]);

    // Not real point-based autofocus — the web platform has no API for that.
    // Best available is re-triggering a single-shot autofocus cycle, which
    // only a handful of Android/Chrome combos actually expose via
    // getCapabilities(); iOS Safari exposes none of this, so there the tap
    // is visual-only feedback and the OS's own continuous autofocus keeps
    // doing its thing regardless.
    const handleFocusTap = event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setFocusPoint({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            id: event.timeStamp,
        });

        // Best-effort only: getCapabilities()/applyConstraints() are missing
        // or throw outright on plenty of browsers (notably iOS Safari) —
        // none of that should ever affect the tap-to-focus visual above.
        try {
            const track = $video.current?.srcObject?.getVideoTracks?.()[0];
            if (track?.getCapabilities?.().focusMode?.includes('single-shot')) {
                track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] }).catch(() => {});
            }
        } catch {
            // unsupported — silently ignored, per above
        }
    };

    const activeDeviceIndex = devices.findIndex(device => device.deviceId === activeDeviceId);
    const activeCameraLabel =
        activeDeviceIndex === -1 ? null : getCameraLabel(devices[activeDeviceIndex], activeDeviceIndex);

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='ScanSkuDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Escanear código</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Apunta la cámara al código de barras o QR del producto.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                {/* DrawerContent (mobile) has no gap between children, unlike
                    DialogContent's own gap-4 (desktop) — this wrapper carries
                    its own gap so spacing stays consistent either way. */}
                <div className='flex flex-col gap-4'>
                    <div
                        className='relative mx-4 overflow-hidden rounded-lg bg-black sm:mx-0'
                        data-block='ScanSkuViewfinder'
                        onClick={handleFocusTap}
                    >
                        <video
                            ref={$video}
                            className='aspect-square w-full object-cover'
                            muted
                            playsInline
                        />
                        <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                            <div className='relative size-3/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'>
                                <span className='absolute top-0 left-0 size-6 border-t-4 border-l-4 border-white' />
                                <span className='absolute top-0 right-0 size-6 border-t-4 border-r-4 border-white' />
                                <span className='absolute bottom-0 left-0 size-6 border-b-4 border-l-4 border-white' />
                                <span className='absolute right-0 bottom-0 size-6 border-r-4 border-b-4 border-white' />
                            </div>
                            {focusPoint && (
                                <span
                                    key={focusPoint.id}
                                    className='absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white animate-focus-ring'
                                    style={{ left: focusPoint.x, top: focusPoint.y }}
                                    onAnimationEnd={() => setFocusPoint(null)}
                                />
                            )}
                        </div>
                    </div>
                    {devices.length > 1 && (
                        <div className='relative z-10000 px-4 mb-4 sm:mb-0 sm:px-0' data-block='ScanSkuCameraSwitcher'>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <button
                                            type='button'
                                            className='flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-left text-sm shadow-xs transition-colors hover:bg-muted'
                                        />
                                    }
                                >
                                    <VideoCameraIcon className='text-muted-foreground' />
                                    <span className='flex-1 truncate'>
                                        {activeCameraLabel ?? 'Cámara'}
                                    </span>
                                    <CaretDownIcon className='text-muted-foreground' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='start' className='min-w-56'>
                                    <DropdownMenuRadioGroup
                                        value={activeDeviceId ?? ''}
                                        onValueChange={setSelectedDeviceId}
                                    >
                                        {devices.map((device, index) => (
                                            <DropdownMenuRadioItem
                                                key={device.deviceId}
                                                value={device.deviceId}
                                            >
                                                {getCameraLabel(device, index)}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    {error && <FieldError className='px-4 sm:px-0'>{error}</FieldError>}
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
