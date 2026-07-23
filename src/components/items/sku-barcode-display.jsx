'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { generateQrDataUrl } from '@/helpers/qr';
import { BARCODE_TYPES, DEFAULT_BARCODE_TYPE, getBarcodeType, parseSku, formatSku } from '@/helpers/barcode';
import { SelectSearch } from '@/ui/select-search';
import { cn } from '@/helpers/utils';

// Renders whatever the sku currently holds as a scannable code, defaulting
// to Code 128 for a plain-typed sku (no type| prefix yet) — the type
// selector lets the user re-tag it as QR/EAN-13/etc, rewriting `value` via
// onChange so the stored sku stays in the `type|code` convention.
export const SkuBarcodeDisplay = ({ value, onChange, className }) => {
    const $canvas = useRef(null);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [renderError, setRenderError] = useState(null);

    const { type: storedType, code } = parseSku(value);
    const effectiveType = storedType ?? DEFAULT_BARCODE_TYPE;
    const barcodeType = getBarcodeType(effectiveType);

    useEffect(() => {
        setRenderError(null);
        setQrDataUrl(null);
        if (!code) return;

        if (effectiveType === 'qr') {
            generateQrDataUrl(code)
                .then(setQrDataUrl)
                .catch(() => setRenderError('No se pudo generar el QR.'));
            return;
        }

        try {
            JsBarcode($canvas.current, code, {
                format: barcodeType.jsBarcodeFormat,
                displayValue: true,
                margin: 8,
                height: 50,
            });
        } catch {
            setRenderError('Este código no es válido para el estándar seleccionado.');
        }
    }, [code, effectiveType, barcodeType]);

    if (!(value ?? '').trim()) return null;

    const handleTypeChange = nextType => onChange(formatSku(nextType, code || value));

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-3',
                className,
            )}
            data-block='SkuBarcodeDisplay'
        >
            <div className='flex min-h-16 w-full items-center justify-center overflow-x-auto'>
                {renderError && <p className='text-xs text-destructive'>{renderError}</p>}
                {!renderError && effectiveType === 'qr' && qrDataUrl && (
                    <img src={qrDataUrl} alt='Código QR' className='size-24' />
                )}
                {!renderError && effectiveType !== 'qr' && <canvas ref={$canvas} />}
            </div>
            <div className='w-40'>
                <SelectSearch
                    options={BARCODE_TYPES}
                    value={effectiveType}
                    onChange={handleTypeChange}
                    getKey={type => type.value}
                    getLabel={type => type.label}
                    placeholder='Estándar'
                    triggerClassName='h-8 text-xs'
                />
            </div>
        </div>
    );
};
