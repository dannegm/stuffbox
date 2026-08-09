'use client';

import { useEffect, useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
} from '@/ui/responsive-dialog';
import { LabelDocument } from '@/components/moves/label-document';
import { buildMockLabels } from '@/helpers/mock-labels';
import { Spinner } from '@/ui/spinner';

const MOCK_COUNT = 8;

// Real PDFViewer + LabelDocument (debug mode, so the die-cut outline shows)
// with Faker mocks — same generator as admin/labels-preview, just triggered
// from the workspace settings form's "Vista previa" button instead of its
// own dedicated route. Mocks regenerate every time the dialog opens.
export const LabelLayoutPreviewDialog = ({ open, onOpenChange, layout }) => {
    const [labels, setLabels] = useState(null);

    useEffect(() => {
        if (!open) return;
        setLabels(null);
        buildMockLabels(MOCK_COUNT).then(setLabels);
    }, [open]);

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent
                data-block='LabelLayoutPreviewDialog'
                className='sm:max-w-3xl'
            >
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
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
