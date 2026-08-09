'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    BroomIcon,
    BugIcon,
    CaretDownIcon,
    DatabaseIcon,
    FrameCornersIcon,
    MonitorIcon,
} from '@phosphor-icons/react/ssr';
import { useSettings } from '@/hooks/use-settings';
import { optimizeStorage } from '@/services/uploads';
import { parseUA } from '@/helpers/ua-parser';
import {
    BREAKPOINT_INDICATOR_POSITIONS,
    BREAKPOINT_INDICATOR_POSITION_LABELS,
} from '@/components/debug/breakpoint-indicator';
import { Field, FieldGroup, FieldContent, FieldLabel, FieldDescription } from '@/ui/field';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/ui/dropdown-menu';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

// Plain label/value row, not a Field — this is read-only environment
// readout, not a form control. Same shape as DummyView's own InfoRow
// (src/components/system/dummy-view.jsx) but kept as a separate copy here
// rather than shared/exported — that component is a static bot stand-in and
// intentionally isn't touched by this admin-only readout.
const EnvironmentInfoRow = ({ label, value }) => (
    <div className='flex min-w-0 items-start gap-2'>
        <span className='w-32 shrink-0 text-xs text-muted-foreground'>{label}</span>
        <span className='min-w-0 flex-1 font-mono text-xs break-words text-foreground'>
            {value ?? '—'}
        </span>
    </div>
);

export default function AdminSettingsPage() {
    const [debug, setDebug] = useSettings('debug', false);
    const [breakpointIndicatorEnabled, setBreakpointIndicatorEnabled] = useSettings(
        'debugTools.breakpointIndicator.enabled',
        false,
    );
    const [breakpointIndicatorPosition, setBreakpointIndicatorPosition] = useSettings(
        'debugTools.breakpointIndicator.position',
        'bottom-right',
    );

    const {
        mutate: optimize,
        isPending,
        data: result,
    } = useMutation({ mutationFn: optimizeStorage });

    // Same readout as DummyView's EnvironmentPanel (window/navigator only
    // resolve client-side, hence the effect) — useful here to check what a
    // real admin session looks like against what /playground shows for a
    // simulated headless capture.
    const [environment, setEnvironment] = useState(null);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const { browser, os, device } = parseUA(navigator.userAgent);
        setEnvironment({
            browser,
            os,
            device,
            screen: `${window.screen.width} × ${window.screen.height}`,
            viewport: `${window.innerWidth} × ${window.innerHeight}`,
            dpr: window.devicePixelRatio,
            colorScheme: mq.matches ? 'oscuro' : 'claro',
            lang: navigator.language,
            online: navigator.onLine ? 'sí' : 'no',
            webdriver: navigator.webdriver ? 'sí' : 'no',
            ua: navigator.userAgent,
        });
    }, []);

    return (
        <div className='mx-auto flex w-full max-w-lg flex-col gap-4' data-block='AdminSettingsPage'>
            <div>
                <h2 className='font-heading text-lg font-semibold tracking-tight'>Ajustes</h2>
                <p className='text-sm text-muted-foreground'>
                    Configuración global del panel de administración.
                </p>
            </div>

            <div
                className='flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                data-block='AdminDebugCard'
            >
                <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4.5'>
                    <BugIcon />
                </span>
                <FieldGroup className='flex-1'>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='admin-debug-mode'>Modo debug</FieldLabel>
                            <FieldDescription>
                                Se guarda solo en este dispositivo (localStorage), no en la base de
                                datos — cada quien lo activa por su cuenta.
                            </FieldDescription>
                        </FieldContent>
                        <Switch id='admin-debug-mode' checked={debug} onCheckedChange={setDebug} />
                    </Field>

                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='admin-breakpoint-indicator'>
                                Indicador de breakpoint
                            </FieldLabel>
                            <FieldDescription>
                                Muestra el breakpoint activo y el tamaño de ventana en una
                                esquina — también local, oculto por defecto.
                            </FieldDescription>
                        </FieldContent>
                        <Switch
                            id='admin-breakpoint-indicator'
                            checked={breakpointIndicatorEnabled}
                            onCheckedChange={setBreakpointIndicatorEnabled}
                        />
                    </Field>

                    {breakpointIndicatorEnabled && (
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='admin-breakpoint-indicator-position'>
                                    Posición
                                </FieldLabel>
                            </FieldContent>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    id='admin-breakpoint-indicator-position'
                                    render={
                                        <Button type='button' variant='outline' size='sm' />
                                    }
                                >
                                    <FrameCornersIcon data-icon='inline-start' />
                                    {BREAKPOINT_INDICATOR_POSITION_LABELS[
                                        breakpointIndicatorPosition
                                    ] ?? BREAKPOINT_INDICATOR_POSITION_LABELS['bottom-right']}
                                    <CaretDownIcon data-icon='inline-end' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                    <DropdownMenuRadioGroup
                                        value={breakpointIndicatorPosition}
                                        onValueChange={setBreakpointIndicatorPosition}
                                    >
                                        {BREAKPOINT_INDICATOR_POSITIONS.map(position => (
                                            <DropdownMenuRadioItem key={position} value={position}>
                                                {BREAKPOINT_INDICATOR_POSITION_LABELS[position]}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </Field>
                    )}
                </FieldGroup>
            </div>

            <div
                className='flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                data-block='AdminStorageCard'
            >
                <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-flourish/15 text-flourish [&_svg]:size-4.5'>
                    <DatabaseIcon />
                </span>
                <FieldGroup className='flex-1'>
                    <Field>
                        <FieldLabel>Optimizar almacenamiento</FieldLabel>
                        <FieldDescription>
                            Busca fotos en R2 que ya no estén referenciadas por ningún item o
                            location (subidas interrumpidas, elementos borrados) y las elimina.
                        </FieldDescription>
                        <Button
                            type='button'
                            variant='outline'
                            className='mt-1 self-start'
                            disabled={isPending}
                            onClick={() => optimize()}
                        >
                            {isPending ? (
                                <Spinner data-icon='inline-start' />
                            ) : (
                                <BroomIcon data-icon='inline-start' />
                            )}
                            Optimizar almacenamiento
                        </Button>
                        {result && (
                            <FieldDescription>
                                Se eliminaron {result.deletedCount} de {result.totalObjects}{' '}
                                objetos.
                            </FieldDescription>
                        )}
                    </Field>
                </FieldGroup>
            </div>

            {environment && (
                <div
                    className='flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                    data-block='AdminEnvironmentCard'
                >
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4.5'>
                        <MonitorIcon />
                    </span>
                    <div className='flex min-w-0 flex-1 flex-col gap-4'>
                        <div>
                            <FieldLabel>Entorno detectado</FieldLabel>
                            <FieldDescription>
                                Este dispositivo/navegador — mismos datos que ve la vista fantasma
                                para bots (`/dummy`, `/playground`), aquí solo para ti.
                            </FieldDescription>
                        </div>
                        <div className='flex flex-col gap-2'>
                            <EnvironmentInfoRow label='Navegador' value={environment.browser} />
                            <EnvironmentInfoRow label='Sistema' value={environment.os} />
                            <EnvironmentInfoRow label='Dispositivo' value={environment.device} />
                            <EnvironmentInfoRow
                                label='Esquema de color'
                                value={environment.colorScheme}
                            />
                            <EnvironmentInfoRow label='Idioma' value={environment.lang} />
                            <EnvironmentInfoRow label='En línea' value={environment.online} />
                            <EnvironmentInfoRow label='Screen' value={environment.screen} />
                            <EnvironmentInfoRow label='Viewport' value={environment.viewport} />
                            <EnvironmentInfoRow label='Pixel ratio' value={environment.dpr} />
                            <EnvironmentInfoRow
                                label='navigator.webdriver'
                                value={environment.webdriver}
                            />
                        </div>
                        <EnvironmentInfoRow label='User agent' value={environment.ua} />
                    </div>
                </div>
            )}
        </div>
    );
}
