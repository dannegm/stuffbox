'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RobotIcon, ArrowSquareOutIcon } from '@phosphor-icons/react/ssr';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Field, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Switch } from '@/ui/switch';
import { Label } from '@/ui/label';
import { Button } from '@/ui/button';

// Dimensions Vercel's headless Chrome actually uses for OG-image / link
// preview captures — matching them here is the whole point of this page.
const PRESETS = [
    { key: 'vercel-screen', label: 'Vercel screen', width: 800, height: 600 },
    { key: 'vercel-viewport', label: 'Vercel viewport', width: 1280, height: 800 },
    { key: 'custom', label: 'Personalizado', width: null, height: null },
];

const buildSrc = (path, forceBot) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!forceBot) return normalized;
    return `${normalized}${normalized.includes('?') ? '&' : '?'}forceBot=1`;
};

export default function PlaygroundPage() {
    const [presetKey, setPresetKey] = useState('vercel-screen');
    const [customWidth, setCustomWidth] = useState(1024);
    const [customHeight, setCustomHeight] = useState(768);
    const [path, setPath] = useState('/');
    const [forceBot, setForceBot] = useState(true);

    const preset = PRESETS.find(item => item.key === presetKey);
    const width = preset.key === 'custom' ? Number(customWidth) || 0 : preset.width;
    const height = preset.key === 'custom' ? Number(customHeight) || 0 : preset.height;
    const src = buildSrc(path, forceBot);

    return (
        <div
            className='mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8'
            data-block='PlaygroundPage'
        >
            <div className='flex items-center gap-4 rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary [&>svg]:size-5'>
                    <RobotIcon weight='fill' />
                </div>
                <div className='flex flex-col'>
                    <h1 className='font-heading text-xl font-semibold tracking-tight'>
                        Playground de HeadlessGuard
                    </h1>
                    <span className='text-sm text-muted-foreground'>
                        Previsualiza localmente lo que ve un rastreador headless, sin necesitar
                        un navegador headless real.
                    </span>
                </div>
            </div>

            <div className='flex flex-col gap-4 rounded-xl border bg-card p-4' data-block='PlaygroundControls'>
                <Field orientation='responsive'>
                    <FieldLabel>Tamaño</FieldLabel>
                    <Tabs value={presetKey} onValueChange={setPresetKey}>
                        <TabsList>
                            {PRESETS.map(item => (
                                <TabsTrigger key={item.key} value={item.key}>
                                    {item.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </Field>

                {preset.key === 'custom' && (
                    <div className='grid grid-cols-2 gap-3'>
                        <Field>
                            <FieldLabel htmlFor='playground-width'>Ancho (px)</FieldLabel>
                            <Input
                                id='playground-width'
                                type='number'
                                min={1}
                                value={customWidth}
                                onChange={event => setCustomWidth(event.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='playground-height'>Alto (px)</FieldLabel>
                            <Input
                                id='playground-height'
                                type='number'
                                min={1}
                                value={customHeight}
                                onChange={event => setCustomHeight(event.target.value)}
                            />
                        </Field>
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor='playground-path'>Ruta a previsualizar</FieldLabel>
                    <Input
                        id='playground-path'
                        value={path}
                        onChange={event => setPath(event.target.value)}
                        placeholder='/'
                    />
                </Field>

                <Label className='flex items-center gap-2'>
                    <Switch checked={forceBot} onCheckedChange={setForceBot} />
                    Simular bot (agrega <code className='font-mono'>?forceBot=1</code>)
                </Label>
            </div>

            <div className='flex flex-col gap-2'>
                <div className='flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground'>
                    <span>
                        {width} × {height} px — <span className='font-mono'>{src}</span>
                    </span>
                    <Button variant='outline' size='sm' render={<Link href={src} target='_blank' />}>
                        Abrir en pestaña nueva
                        <ArrowSquareOutIcon data-icon='inline-end' />
                    </Button>
                </div>

                <div className='overflow-auto rounded-xl border bg-muted/30 p-4'>
                    <iframe
                        key={`${src}-${width}-${height}`}
                        src={src}
                        width={width}
                        height={height}
                        className='rounded-lg border bg-background shadow-sm'
                        title='Vista previa'
                    />
                </div>
            </div>

            <div className='text-sm text-muted-foreground'>
                ¿Quieres ver el marcador tal cual, sin iframe?{' '}
                <Link href='/dummy' className='underline underline-offset-4 hover:text-primary'>
                    Abre /dummy directamente
                </Link>
                .
            </div>
        </div>
    );
}
