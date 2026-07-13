'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    CaretLeftIcon,
    PrinterIcon,
    DownloadSimpleIcon,
    PaperPlaneTiltIcon,
} from '@phosphor-icons/react/ssr';
import { pdf } from '@react-pdf/renderer';
import { moveQuery, packedInMoveQuery } from '@/queries/moves';
import { locationCountsQuery } from '@/queries/locations';
import { LabelDocument } from '@/components/moves/label-document';
import { generateQrDataUrl } from '@/helpers/qr';
import { getItemIcon } from '@/helpers/item';
import { getLocationIcon } from '@/helpers/location';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const AI_SUMMARY_MIN_CHILDREN = 4;

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='MoveLabelsLoading'>
        <Spinner className='size-6' />
    </div>
);

// Same button-root + stopPropagation-on-checkbox shape as ItemListRow/
// LocationListItem — without it, a click on the checkbox glyph bubbles to
// the row's own click handler and double-toggles (net: nothing happens).
const SelectableRow = ({ icon, name, checked, onToggle, note }) => (
    <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted'
    >
        <span onClick={event => event.stopPropagation()}>
            <Checkbox checked={checked} onCheckedChange={onToggle} />
        </span>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
            <DynamicIcon icon={icon} />
        </span>
        <span className='min-w-0 flex-1'>
            <span className='block truncate font-medium'>{name}</span>
            {note && <span className='block truncate text-xs text-muted-foreground'>{note}</span>}
        </span>
    </button>
);

export default function MoveLabelsPage({ params }) {
    const { id } = use(params);
    const $printFrame = useRef(null);

    const [step, setStep] = useState('select'); // 'select' | 'confirm' | 'result'
    const [seeded, setSeeded] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [selectedLocationIds, setSelectedLocationIds] = useState(new Set());
    const [confirmedItemIds, setConfirmedItemIds] = useState(new Set());
    const [confirmedLocationIds, setConfirmedLocationIds] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null); // null | 'ok' | 'error'

    const { data: move, isPending: isMovePending } = useQuery(moveQuery(id));
    const { data: packed, isPending: isPackedPending } = useQuery(packedInMoveQuery(id));

    useEffect(() => {
        if (!packed || seeded) return;
        setSelectedItemIds(new Set(packed.items.map(item => item.id)));
        setSelectedLocationIds(new Set(packed.locations.map(location => location.id)));
        setSeeded(true);
    }, [packed, seeded]);

    const { data: locationCounts } = useQuery(
        locationCountsQuery(packed?.locations.map(location => location.id) ?? [], {
            enabled: !!packed?.locations.length,
        }),
    );

    const toggleSelectedItem = itemId =>
        setSelectedItemIds(current => {
            const next = new Set(current);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });

    const toggleSelectedLocation = locationId =>
        setSelectedLocationIds(current => {
            const next = new Set(current);
            next.has(locationId) ? next.delete(locationId) : next.add(locationId);
            return next;
        });

    const toggleConfirmedItem = itemId =>
        setConfirmedItemIds(current => {
            const next = new Set(current);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });

    const toggleConfirmedLocation = locationId =>
        setConfirmedLocationIds(current => {
            const next = new Set(current);
            next.has(locationId) ? next.delete(locationId) : next.add(locationId);
            return next;
        });

    const handleGoToConfirm = () => {
        // Nested boxes are skipped by default — the outer box's own label
        // already covers them, no need for a redundant one (stuffbox-plan.md
        // §8). Still shown, just unchecked, so the owner can override.
        const nested = new Set(
            packed?.locations
                .filter(
                    location =>
                        selectedLocationIds.has(location.id) &&
                        selectedLocationIds.has(location.parent_id),
                )
                .map(location => location.id),
        );
        setConfirmedItemIds(new Set(selectedItemIds));
        setConfirmedLocationIds(
            new Set([...selectedLocationIds].filter(locationId => !nested.has(locationId))),
        );
        setStep('confirm');
    };

    const handleGeneratePdf = async () => {
        setIsGenerating(true);
        try {
            const confirmedItems = packed?.items.filter(item => confirmedItemIds.has(item.id));
            const confirmedLocations = packed?.locations.filter(location =>
                confirmedLocationIds.has(location.id),
            );

            const itemLabels = await Promise.all(
                confirmedItems.map(async item => ({
                    id: `item-${item.id}`,
                    name: item.name,
                    isFragile: item.is_fragile,
                    summary: null,
                    qrDataUrl: await generateQrDataUrl(`${APP_URL}/i/${item.id}`),
                })),
            );
            const locationLabels = await Promise.all(
                confirmedLocations.map(async location => {
                    const counts = locationCounts?.[location.id];
                    const childCount = (counts?.locations ?? 0) + (counts?.items ?? 0);
                    const showSummary =
                        !!location.ai_summary && childCount >= AI_SUMMARY_MIN_CHILDREN;
                    return {
                        id: `location-${location.id}`,
                        name: location.name,
                        isFragile: location.is_fragile,
                        summary: showSummary ? location.ai_summary : null,
                        qrDataUrl: await generateQrDataUrl(`${APP_URL}/l/${location.id}`),
                    };
                }),
            );

            const blob = await pdf(
                <LabelDocument labels={[...locationLabels, ...itemLabels]} />,
            ).toBlob();
            setPdfBlob(blob);
            setPdfUrl(URL.createObjectURL(blob));
            setStep('result');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        $printFrame.current?.contentWindow?.print();
    };

    const handleSend = async event => {
        event.preventDefault();
        if (!email.trim() || !pdfBlob) return;
        setIsSending(true);
        setSendResult(null);
        try {
            const formData = new FormData();
            formData.append('email', email.trim());
            formData.append('moveName', move?.name);
            formData.append('file', pdfBlob, 'etiquetas.pdf');
            const response = await fetch('/api/labels/email', { method: 'POST', body: formData });
            setSendResult(response.ok ? 'ok' : 'error');
        } catch {
            setSendResult('error');
        } finally {
            setIsSending(false);
        }
    };

    if (isMovePending || !move || isPackedPending || !packed) {
        return <Loading />;
    }

    const isEmpty = packed.items.length === 0 && packed.locations.length === 0;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='MoveLabelsPage'
        >
            <div className='flex items-center gap-2'>
                <Button size='icon-sm' variant='outline' render={<Link href={`/move/${id}`} />}>
                    <CaretLeftIcon />
                </Button>
                <div className='min-w-0'>
                    <h1 className='truncate font-heading text-lg leading-tight font-medium'>
                        Etiquetas — {move.name}
                    </h1>
                    <p className='truncate text-xs text-muted-foreground'>
                        {step === 'select' && 'Paso 1: elige qué va en las etiquetas'}
                        {step === 'confirm' && 'Paso 2: confirma cuáles llevan etiqueta impresa'}
                        {step === 'result' && 'Listo'}
                    </p>
                </div>
            </div>

            {isEmpty ? (
                <Empty className='flex-1' data-block='MoveLabelsEmpty'>
                    <EmptyHeader>
                        <EmptyTitle>Nada empacado todavía</EmptyTitle>
                        <EmptyDescription>
                            Empaca algo en esta mudanza antes de generar etiquetas.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    {step === 'select' && (
                        <>
                            <div className='flex flex-col gap-2'>
                                {packed.locations.map(location => (
                                    <SelectableRow
                                        key={location.id}
                                        icon={getLocationIcon(location)}
                                        name={location.name}
                                        checked={selectedLocationIds.has(location.id)}
                                        onToggle={() => toggleSelectedLocation(location.id)}
                                    />
                                ))}
                                {packed.items.map(item => (
                                    <SelectableRow
                                        key={item.id}
                                        icon={getItemIcon(item)}
                                        name={item.name}
                                        checked={selectedItemIds.has(item.id)}
                                        onToggle={() => toggleSelectedItem(item.id)}
                                    />
                                ))}
                            </div>
                            <Button
                                disabled={selectedItemIds.size + selectedLocationIds.size === 0}
                                onClick={handleGoToConfirm}
                            >
                                Siguiente
                            </Button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <div className='flex flex-col gap-2'>
                                {packed.locations
                                    .filter(location => selectedLocationIds.has(location.id))
                                    .map(location => {
                                        const parent = packed.locations.find(
                                            candidate => candidate.id === location.parent_id,
                                        );
                                        const isNested =
                                            parent && selectedLocationIds.has(parent.id);
                                        return (
                                            <SelectableRow
                                                key={location.id}
                                                icon={getLocationIcon(location)}
                                                name={location.name}
                                                note={
                                                    isNested
                                                        ? `Anidada en "${parent.name}" — ya cubierta por su etiqueta`
                                                        : undefined
                                                }
                                                checked={confirmedLocationIds.has(location.id)}
                                                onToggle={() =>
                                                    toggleConfirmedLocation(location.id)
                                                }
                                            />
                                        );
                                    })}
                                {packed.items
                                    .filter(item => selectedItemIds.has(item.id))
                                    .map(item => (
                                        <SelectableRow
                                            key={item.id}
                                            icon={getItemIcon(item)}
                                            name={item.name}
                                            checked={confirmedItemIds.has(item.id)}
                                            onToggle={() => toggleConfirmedItem(item.id)}
                                        />
                                    ))}
                            </div>
                            <div className='flex gap-2'>
                                <Button
                                    variant='outline'
                                    className='flex-1'
                                    onClick={() => setStep('select')}
                                >
                                    Atrás
                                </Button>
                                <Button
                                    className='flex-1'
                                    disabled={
                                        isGenerating ||
                                        confirmedItemIds.size + confirmedLocationIds.size === 0
                                    }
                                    onClick={handleGeneratePdf}
                                >
                                    {isGenerating && <Spinner data-icon='inline-start' />}
                                    Generar PDF
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'result' && pdfUrl && (
                        <div className='flex flex-col gap-4'>
                            {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                            <iframe ref={$printFrame} src={pdfUrl} className='hidden' />

                            <div className='flex flex-col gap-2 rounded-lg border p-3'>
                                <Button onClick={handlePrint}>
                                    <PrinterIcon data-icon='inline-start' />
                                    Imprimir
                                </Button>
                                <Button
                                    variant='outline'
                                    render={<a href={pdfUrl} download='etiquetas.pdf' />}
                                >
                                    <DownloadSimpleIcon data-icon='inline-start' />
                                    Descargar
                                </Button>
                            </div>

                            <form
                                onSubmit={handleSend}
                                className='flex flex-col gap-2 rounded-lg border p-3'
                            >
                                <p className='text-sm font-medium'>Enviar por correo</p>
                                <div className='flex gap-2'>
                                    <Input
                                        type='email'
                                        required
                                        value={email}
                                        onChange={event => setEmail(event.target.value)}
                                        placeholder='correo@ejemplo.com'
                                    />
                                    <Button type='submit' disabled={isSending || !email.trim()}>
                                        {isSending ? (
                                            <Spinner data-icon='inline-start' />
                                        ) : (
                                            <PaperPlaneTiltIcon data-icon='inline-start' />
                                        )}
                                        Enviar
                                    </Button>
                                </div>
                                {sendResult === 'ok' && (
                                    <p className='text-xs text-muted-foreground'>Enviado.</p>
                                )}
                                {sendResult === 'error' && (
                                    <p className='text-xs text-destructive'>
                                        No se pudo enviar. Intenta de nuevo.
                                    </p>
                                )}
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
