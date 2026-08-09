'use client';

import { useCallback, useEffect, useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/ssr';
import { LabelDocument } from '@/components/moves/label-document';
import { buildMockLabels } from '@/helpers/mock-labels';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Slider } from '@/ui/slider';
import { Field, FieldLabel, FieldDescription } from '@/ui/field';

const DEFAULT_COUNT = 8;
const MAX_COUNT = 20;

export default function AdminLabelsPreviewPage() {
    const [count, setCount] = useState(DEFAULT_COUNT);
    const [labels, setLabels] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const generate = useCallback(async mockCount => {
        setIsGenerating(true);
        try {
            setLabels(await buildMockLabels(mockCount));
        } finally {
            setIsGenerating(false);
            setRefreshKey(prev => prev + 1);
        }
    }, []);

    // Only on mount — the slider re-generates on release (onValueCommitted),
    // not on every drag tick, since each run does `count` async QR encodes.
    // PDFViewer (unlike the old manual pdf().toBlob() + iframe approach) is a
    // real mounted component, so it — and edits to LabelDocument's styles —
    // pick up Fast Refresh normally instead of needing a hard browser reload.
    useEffect(() => {
        generate(DEFAULT_COUNT);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className='flex flex-1 flex-col gap-4' data-block='AdminLabelsPreviewPage'>
            <div
                className='flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                data-block='AdminLabelsPreviewControls'
            >
                <div className='flex justify-between items-center'>
                    <div className='flex flex-col gap-1'>
                        <h2 className='font-heading text-lg font-semibold tracking-tight'>
                            Preview de etiquetas
                        </h2>
                        <p className='text-sm text-muted-foreground'>
                            Datos mock generados con Faker — para iterar sobre LabelDocument sin
                            pasar por el wizard de mudanzas.
                        </p>
                    </div>

                    <Button
                        type='button'
                        variant='outline'
                        disabled={isGenerating}
                        onClick={() => generate(count)}
                    >
                        {isGenerating ? (
                            <Spinner data-icon='inline-start' />
                        ) : (
                            <ArrowClockwiseIcon data-icon='inline-start' />
                        )}
                        Refrescar
                    </Button>
                </div>

                <Field className='mt-3'>
                    <FieldLabel htmlFor='mock-count'>
                        Cantidad de etiquetas
                        <span className='bg-accent/20 text-accent py-0.5 px-2 rounded-xl shrink-0 text-xs font-medium tabular-nums'>
                            {count} etiqueta{count === 1 ? '' : 's'}
                        </span>
                    </FieldLabel>
                    <div className='flex items-center gap-3'>
                        <Slider
                            id='mock-count'
                            min={0}
                            max={MAX_COUNT}
                            value={count}
                            onValueChange={value => setCount(value)}
                            onValueCommitted={value => generate(value)}
                        />
                    </div>
                    <FieldDescription>De 0 a {MAX_COUNT}, por defecto 8.</FieldDescription>
                </Field>
            </div>

            <PDFViewer key={refreshKey} showToolbar className='h-[80vh] w-full rounded-lg border'>
                <LabelDocument labels={labels} debug={true} />
            </PDFViewer>
        </div>
    );
}
