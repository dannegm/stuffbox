'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    CaretLeftIcon,
    PrinterIcon,
    DownloadSimpleIcon,
    PaperPlaneTiltIcon,
    QrCodeIcon,
    CheckIcon,
    ArrowUpIcon,
    PackageIcon,
} from '@phosphor-icons/react/ssr';
import { pdf } from '@react-pdf/renderer';
import { moveQuery, packedInMoveQuery } from '@/queries/moves';
import { locationChildrenQuery } from '@/queries/locations';
import { itemsAtLocationQuery } from '@/queries/items';
import { workspaceSettingQuery } from '@/queries/workspace-settings';
import { LabelDocument } from '@/components/moves/label-document';
import { generateQrDataUrl } from '@/helpers/qr';
import { DEFAULT_LABEL_LAYOUT } from '@/helpers/label-layout';
import { isAIConfigured } from '@/services/ai';
import {
    generateItemLabelDescription,
    generateContainerLabelDescription,
} from '@/services/label-descriptions';
import { getItemIcon } from '@/helpers/item';
import { getLocationIcon } from '@/helpers/location';
import { cn } from '@/helpers/utils';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Checkbox } from '@/ui/checkbox';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='MoveLabelsLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
            <Skeleton className='h-14 w-full rounded-lg' />
        </div>
    </div>
);

// Same button-root + stopPropagation-on-checkbox shape as ItemListRow/
// LocationListItem — without it, a click on the checkbox glyph bubbles to
// the row's own click handler and double-toggles (net: nothing happens).
// Checked rows pick up a flourish tint so the selection state reads as
// "already on the tape" rather than a plain checkbox list.
const SelectableRow = ({ icon, name, checked, onToggle, note }) => (
    <button
        type='button'
        onClick={onToggle}
        className={cn(
            'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted',
            checked && 'border-flourish/40 bg-flourish/5',
        )}
        data-block='LabelSelectableRow'
    >
        <span onClick={event => event.stopPropagation()}>
            <Checkbox checked={checked} onCheckedChange={onToggle} />
        </span>
        <span
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-md text-foreground [&_svg]:size-4',
                checked ? 'bg-flourish/15 text-flourish' : 'bg-muted',
            )}
        >
            <DynamicIcon icon={icon} />
        </span>
        <span className='min-w-0 flex-1'>
            <span className='block truncate font-medium'>{name}</span>
            {note && <span className='block truncate text-xs text-muted-foreground'>{note}</span>}
        </span>
    </button>
);

// Top-of-page progress affordance for the 3-step wizard — purely visual,
// mirrors the `step` state already driving which panel renders below.
const WIZARD_STEPS = [
    { key: 'select', label: 'Elegir' },
    { key: 'confirm', label: 'Confirmar' },
    { key: 'result', label: 'Generar' },
];

const StepIndicator = ({ step, className }) => {
    const activeIndex = WIZARD_STEPS.findIndex(candidate => candidate.key === step);
    return (
        <div className={cn('flex items-center', className)} data-block='LabelWizardSteps'>
            {WIZARD_STEPS.map((wizardStep, index) => (
                <div key={wizardStep.key} className='flex flex-1 items-center last:flex-none'>
                    <div className='flex flex-col items-center gap-1'>
                        <span
                            className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 [&_svg]:size-3',
                                index < activeIndex &&
                                    'bg-flourish text-flourish-foreground ring-flourish/50',
                                index === activeIndex &&
                                    'bg-card text-flourish shadow-xs shadow-black/10 ring-flourish',
                                index > activeIndex &&
                                    'bg-card/70 text-muted-foreground ring-foreground/10',
                            )}
                        >
                            {index < activeIndex ? <CheckIcon weight='bold' /> : index + 1}
                        </span>
                        <span className='text-[0.65rem] font-medium text-muted-foreground'>
                            {wizardStep.label}
                        </span>
                    </div>
                    {index < WIZARD_STEPS.length - 1 && (
                        <span
                            className={cn(
                                'mx-2 h-px flex-1',
                                index < activeIndex ? 'bg-flourish' : 'bg-foreground/10',
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

// A mocked-up, deliberately print-styled (white/black, not theme tokens —
// same reasoning as label-document.jsx, since this represents literal paper)
// label card — gives a sense of the real PDF's layout (QR + name + fragile/
// up icons) before the real QR is generated, which only happens on submit.
const LabelPreviewCard = ({ name, isFragile, className, style }) => (
    <div
        className={cn(
            'flex w-36 shrink-0 flex-col gap-2 rounded-sm border border-black/15 bg-white p-2.5 shadow-md shadow-black/25',
            className,
        )}
        style={style}
    >
        <div className='flex items-start gap-2'>
            <span className='flex size-8 shrink-0 items-center justify-center rounded-xs border border-dashed border-black/20 bg-black/5'>
                <QrCodeIcon weight='light' className='size-6 text-black/35' />
            </span>
            <p className='min-w-0 flex-1 truncate text-sm leading-tight font-bold text-black'>
                {name}
            </p>
        </div>
        <div className='flex items-center gap-1.5 border-t border-black/10 pt-1.5'>
            {isFragile && (
                <span className='text-[0.55rem] font-bold tracking-wide text-red-600'>FRÁGIL</span>
            )}
            <ArrowUpIcon weight='bold' className='ml-auto size-3 text-black/60' />
        </div>
    </div>
);

// Small fanned-out stack, like a handful of printed tags — representative,
// not exhaustive (caps at 3 + a count), just to give a feel for the batch
// about to be generated, before/while the real PDF is being built.
const LabelPreviewStack = ({ labels }) => {
    if (labels.length === 0) return null;
    const preview = labels.slice(0, 3);

    return (
        <div className='flex flex-col items-center gap-2' data-block='LabelPreviewStack'>
            <div className='relative h-28 w-36'>
                {preview.map((label, index) => (
                    <LabelPreviewCard
                        key={label.id}
                        name={label.name}
                        isFragile={label.isFragile}
                        className='absolute inset-x-0 top-0'
                        style={{
                            transform: `rotate(${(index - (preview.length - 1) / 2) * 6}deg) translateY(${index * 6}px)`,
                            zIndex: index,
                        }}
                    />
                ))}
            </div>
            <p className='text-xs text-muted-foreground'>
                {labels.length} etiqueta{labels.length === 1 ? '' : 's'}
            </p>
        </div>
    );
};

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
    const { data: labelLayoutSettings } = useQuery(
        workspaceSettingQuery(move?.workspace_id, 'labelLayoutSettings', { enabled: !!move }),
    );

    useEffect(() => {
        if (!packed || seeded) return;
        setSelectedItemIds(new Set(packed.items.map(item => item.id)));
        setSelectedLocationIds(new Set(packed.locations.map(location => location.id)));
        setSeeded(true);
    }, [packed, seeded]);

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
            const aiEnabled = isAIConfigured();

            const itemLabels = await Promise.all(
                confirmedItems.map(async item => {
                    const summary = aiEnabled
                        ? await generateItemLabelDescription({
                              name: item.name,
                              description: item.description,
                              quantity: item.quantity,
                              condition: item.condition,
                              sentimentalValue: item.sentimental_value,
                              tags: item.item_tags?.map(({ tags }) => tags.name) ?? [],
                          }).catch(() => '')
                        : '';
                    return {
                        id: `item-${item.id}`,
                        name: item.name,
                        isFragile: item.is_fragile,
                        summary: summary || null,
                        orientation: item.storage_orientation,
                        qrDataUrl: await generateQrDataUrl(`${APP_URL}/i/${item.id}`),
                    };
                }),
            );
            const locationLabels = await Promise.all(
                confirmedLocations.map(async location => {
                    const summary = aiEnabled
                        ? await (async () => {
                              const [childItems, childLocations] = await Promise.all([
                                  itemsAtLocationQuery(location.id).queryFn(),
                                  locationChildrenQuery({
                                      workspaceId: move.workspace_id,
                                      parentId: location.id,
                                  }).queryFn(),
                              ]);
                              return generateContainerLabelDescription({
                                  name: location.name,
                                  type: location.type,
                                  childItemNames: childItems.map(childItem => childItem.name),
                                  childLocationNames: childLocations.map(
                                      childLocation => childLocation.name,
                                  ),
                              });
                          })().catch(() => '')
                        : '';
                    return {
                        id: `location-${location.id}`,
                        name: location.name,
                        isFragile: location.is_fragile,
                        summary: summary || null,
                        orientation: location.storage_orientation,
                        qrDataUrl: await generateQrDataUrl(`${APP_URL}/l/${location.id}`),
                    };
                }),
            );

            const layout = { ...DEFAULT_LABEL_LAYOUT, ...(labelLayoutSettings ?? {}) };
            const blob = await pdf(
                <LabelDocument
                    labels={[...locationLabels, ...itemLabels]}
                    debug={false}
                    {...layout}
                />,
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

    // Same shape as handleGeneratePdf's confirmed{Items,Locations}, minus the
    // async QR — just enough to render the mocked preview stack below.
    const previewLabels = [
        ...packed.locations
            .filter(location => confirmedLocationIds.has(location.id))
            .map(location => ({
                id: location.id,
                name: location.name,
                isFragile: location.is_fragile,
            })),
        ...packed.items
            .filter(item => confirmedItemIds.has(item.id))
            .map(item => ({ id: item.id, name: item.name, isFragile: item.is_fragile })),
    ];

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-12'
            data-block='MoveLabelsPage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='MoveLabelsHero'
            >
                <div className='flex items-center gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-flourish shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-4.5'>
                        <PrinterIcon />
                    </span>
                    <div className='min-w-0 flex-1'>
                        <h1 className='truncate font-heading text-lg leading-tight font-semibold tracking-tight'>
                            Etiquetas — {move.name}
                        </h1>
                        <p className='truncate text-xs text-muted-foreground'>
                            {step === 'select' && 'Paso 1: elige qué va en las etiquetas'}
                            {step === 'confirm' &&
                                'Paso 2: confirma cuáles llevan etiqueta impresa'}
                            {step === 'result' && 'Listo'}
                        </p>
                    </div>
                </div>
                {!isEmpty && <StepIndicator step={step} className='mt-4' />}
            </div>

            {isEmpty ? (
                <Empty className='flex-1' data-block='MoveLabelsEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-flourish/15 text-flourish'>
                            <PackageIcon />
                        </EmptyMedia>
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
                            <LabelPreviewStack labels={previewLabels} />
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

                            <div
                                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                                data-block='MoveLabelsResultHero'
                            >
                                <LabelPreviewStack labels={previewLabels} />
                                <p className='mt-2 text-center text-sm font-medium'>
                                    Listas para imprimir
                                </p>
                            </div>

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
