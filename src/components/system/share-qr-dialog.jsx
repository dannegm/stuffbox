'use client';

import { useEffect, useState } from 'react';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Spinner } from '@/ui/spinner';
import { generateQrDataUrl } from '@/helpers/qr';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// Scan-to-open sharing for a single location/item — controlled open state
// (same reasoning as ConvertToLocationDialog) since every caller opens this
// from a button/menu item, never owns its own trigger. Reuses the same
// client-side QR generator as the move labels PDF (src/helpers/qr.js) and
// the same short /l//i deep-link routes (denser scan than /location//item),
// not a stored asset — regenerated on every open.
export const ShareQrDialog = ({ open, onOpenChange, path, name }) => {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const url = `${APP_URL}${path}`;

    useEffect(() => {
        if (!open) return;
        setQrDataUrl(null);
        generateQrDataUrl(url).then(setQrDataUrl);
    }, [open, url]);

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='ShareQrDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Compartir "{name}"</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Escanea este código para abrirlo directamente en otro dispositivo.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className='flex flex-col items-center gap-3 px-4 pb-4 sm:px-0 sm:pb-0'>
                    <div className='flex size-48 items-center justify-center rounded-lg border bg-muted/30 p-3'>
                        {qrDataUrl ? (
                            <img
                                src={qrDataUrl}
                                alt={`Código QR de ${name}`}
                                className='size-full'
                            />
                        ) : (
                            <Spinner className='size-6' />
                        )}
                    </div>
                    <p className='truncate text-xs text-muted-foreground'>{url}</p>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
