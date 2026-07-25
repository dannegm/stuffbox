'use client';

import { useEffect, useState } from 'react';
import { PackageIcon, RobotIcon, MonitorIcon, GhostIcon } from '@phosphor-icons/react/ssr';
import { parseUA } from '@/helpers/ua-parser';
import { Skeleton } from '@/ui/skeleton';

const SidebarBone = () => (
    <aside
        className='hidden shrink-0 flex-col items-center gap-2 border-r bg-sidebar px-2 py-4 sm:flex sm:w-16'
        data-block='DummyViewSidebar'
    >
        <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary [&>svg]:size-4'>
            <PackageIcon weight='fill' />
        </div>
        <div className='my-2 w-full border-t border-foreground/5' />
        <Skeleton className='size-8 rounded-lg' />
        <Skeleton className='size-8 rounded-lg' />
        <Skeleton className='size-8 rounded-lg' />
        <div className='flex-1' />
        <Skeleton className='size-8 rounded-lg' />
        <Skeleton className='size-8 rounded-full' />
    </aside>
);

const InfoRow = ({ label, value }) => (
    <div className='flex items-baseline gap-2'>
        <span className='w-32 shrink-0 text-sm text-muted-foreground'>{label}</span>
        <span className='truncate font-mono text-xs text-foreground'>{value ?? '—'}</span>
    </div>
);

// Client-only environment readout (mirrors what bins' BrowserInfo surfaces) —
// useful to eyeball a real Vercel headless capture against /playground.
const EnvironmentPanel = () => {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const { browser, os, device } = parseUA(navigator.userAgent);
        setInfo({
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

    if (!info) return null;

    return (
        <div
            className='flex flex-col gap-4 rounded-xl border bg-card p-4 ring-1 ring-foreground/5'
            data-block='DummyViewEnvironment'
        >
            <div className='flex items-center gap-2 text-sm font-semibold'>
                <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:size-3.5'>
                    <MonitorIcon />
                </span>
                Entorno detectado
            </div>
            <div className='grid grid-cols-1 gap-y-2 sm:grid-cols-2'>
                <InfoRow label='Navegador' value={info.browser} />
                <InfoRow label='Sistema' value={info.os} />
                <InfoRow label='Dispositivo' value={info.device} />
                <InfoRow label='Esquema de color' value={info.colorScheme} />
                <InfoRow label='Idioma' value={info.lang} />
                <InfoRow label='En línea' value={info.online} />
                <InfoRow label='Screen' value={info.screen} />
                <InfoRow label='Viewport' value={info.viewport} />
                <InfoRow label='Pixel ratio' value={info.dpr} />
                <InfoRow label='navigator.webdriver' value={info.webdriver} />
            </div>
            <InfoRow label='User agent' value={info.ua} />
        </div>
    );
};

// Ad hoc, stuffbox-styled stand-in for headless visitors — Vercel's OG-image
// and link-preview crawlers run a real headless Chrome that executes our JS
// like any visitor. See HeadlessGuard for when this renders. Static shell
// only: no queries, no auth, no writes, so a crawler capturing this can
// never trigger a real mutation (auto-provisioning, redirects, etc).
export const DummyView = () => (
    <div className='flex min-h-screen bg-background' data-block='DummyView'>
        <SidebarBone />
        <main className='flex flex-1 flex-col gap-6 p-4 sm:p-8'>
            <div className='flex items-center gap-4 rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary [&>svg]:size-5'>
                    <RobotIcon weight='fill' />
                </div>
                <div className='flex flex-col'>
                    <span className='font-heading text-lg font-semibold tracking-tight'>
                        Stuffbox
                    </span>
                    <span className='text-sm text-muted-foreground'>Inventario del hogar</span>
                </div>
            </div>

            <div
                className='flex items-center gap-4 rounded-xl border border-flourish/30 bg-flourish/5 px-6 py-4'
                data-block='DummyViewNotice'
            >
                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-flourish/15 text-flourish [&>svg]:size-5'>
                    <GhostIcon weight='fill' />
                </div>
                <div className='flex flex-col gap-0.5'>
                    <span className='text-base font-semibold text-flourish'>
                        Eres un navegador automatizado.
                    </span>
                    <span className='text-sm text-muted-foreground'>
                        Esta vista es un marcador estático para rastreadores y capturas
                        automáticas (por ejemplo, la vista previa de enlaces de Vercel). No
                        dispara ninguna consulta ni escritura real. Si eres una persona y ves
                        esto, encontraste el modo fantasma.
                    </span>
                </div>
            </div>

            <EnvironmentPanel />
        </main>
    </div>
);
