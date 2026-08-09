'use client';

import { useEffect, useRef, useState } from 'react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { PrinterIcon, DownloadSimpleIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
} from '@/ui/responsive-dialog';
import { LabelDocument } from '@/components/moves/label-document';
import { buildMockLabels } from '@/helpers/mock-labels';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

const MOCK_COUNT = 8;

// Real PDFViewer + LabelDocument (debug mode, so the die-cut outline shows)
// with Faker mocks, triggered from the workspace settings form's "Vista
// previa" button. Mocks regenerate every time the dialog opens.
export const LabelLayoutPreviewDialog = ({ open, onOpenChange, layout }) => {
    const $printFrame = useRef(null);
    const [labels, setLabels] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);

    useEffect(() => {
        if (!open) return;
        setLabels(null);
        setPdfUrl(null);
        buildMockLabels(MOCK_COUNT).then(setLabels);
    }, [open]);

    // Same document the PDFViewer below already renders live — built once
    // more into an actual blob so Imprimir/Descargar have real bytes to work
    // with (a PDFViewer iframe has no reliable cross-browser way to hand its
    // own rendered bytes back out).
    useEffect(() => {
        if (!labels) return;
        pdf(<LabelDocument labels={labels} debug={true} {...layout} />)
            .toBlob()
            .then(blob => setPdfUrl(URL.createObjectURL(blob)));
    }, [labels, layout]);

    const handlePrint = () => {
        $printFrame.current?.contentWindow?.print();
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent
                data-block='LabelLayoutPreviewDialog'
                className='sm:max-w-3xl'
            >
                {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                <iframe ref={$printFrame} src={pdfUrl} className='hidden' />

                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Vista previa de etiquetas</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Datos de ejemplo — así se ven con esta configuración.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className='flex h-[70vh] items-center justify-center px-4 sm:px-0'>
                    {labels ? (
                        <PDFViewer showToolbar className='h-full w-full rounded-lg border'>
                            <LabelDocument labels={labels} debug={true} {...layout} />
                        </PDFViewer>
                    ) : (
                        <Spinner />
                    )}
                </div>
                <ResponsiveDialogFooter className='flex-row'>
                    <Button
                        variant='outline'
                        disabled={!pdfUrl}
                        onClick={handlePrint}
                        className='flex-1'
                    >
                        <PrinterIcon data-icon='inline-start' />
                        Imprimir
                    </Button>
                    {/* Not just `disabled` on the anchor-rendered version —
                    `disabled` relies on the `:disabled` CSS pseudo-class,
                    which never matches an `<a>` no matter what prop you pass
                    it, so the button would stay clickable-looking (and
                    clickable) with a null href while the PDF is still
                    building. */}
                    {pdfUrl ? (
                        <Button
                            variant='outline'
                            className='flex-1'
                            render={<a href={pdfUrl} download='etiquetas-preview.pdf' />}
                        >
                            <DownloadSimpleIcon data-icon='inline-start' />
                            Descargar
                        </Button>
                    ) : (
                        <Button variant='outline' disabled className='flex-1'>
                            <DownloadSimpleIcon data-icon='inline-start' />
                            Descargar
                        </Button>
                    )}
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
