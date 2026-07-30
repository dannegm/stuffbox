'use client';

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon, CaretDownIcon, CheckIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDropdownMenu,
    ResponsiveDropdownMenuContent,
    ResponsiveDropdownMenuItem,
    ResponsiveDropdownMenuTrigger,
} from '@/ui/responsive-dropdown-menu';
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { useSettings } from '@/hooks/use-settings';
import { defaultSettings } from '@/constants/default-settings';
import { AI_PROVIDERS } from '@/constants/ai-providers';

// Bring-your-own-key AI setup: provider + token live only in this browser's
// localStorage (src/services/settings.js, key `ai`) — never the DB, never a
// server env var. src/services/ai.js reads this same key to build the
// actual model instance whenever a future AI feature needs one.
export const AiIntegrationSection = () => {
    const [ai, setAi] = useSettings('ai', defaultSettings.ai);
    const [showKey, setShowKey] = useState(false);

    const provider = AI_PROVIDERS.find(candidate => candidate.id === ai.provider) ?? AI_PROVIDERS[0];
    const apiKey = ai.keys?.[provider.id] ?? '';

    const setProvider = id => setAi(prev => ({ ...prev, provider: id }));
    const setApiKey = value =>
        setAi(prev => ({ ...prev, keys: { ...prev.keys, [provider.id]: value } }));
    const setModel = value => setAi(prev => ({ ...prev, model: value }));

    return (
        <div className='flex flex-col gap-3' data-block='AiIntegrationSection'>
            <FieldGroup>
                <Field>
                    <FieldLabel>Proveedor</FieldLabel>
                    <ResponsiveDropdownMenu>
                        <ResponsiveDropdownMenuTrigger
                            render={
                                <button
                                    type='button'
                                    className='flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-left text-sm shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted'
                                />
                            }
                        >
                            {provider.label}
                            <CaretDownIcon className='size-3.5 shrink-0 text-muted-foreground' />
                        </ResponsiveDropdownMenuTrigger>
                        <ResponsiveDropdownMenuContent className='w-56' align='start'>
                            {AI_PROVIDERS.map(candidate => (
                                <ResponsiveDropdownMenuItem
                                    key={candidate.id}
                                    onClick={() => setProvider(candidate.id)}
                                >
                                    <span className='flex-1'>{candidate.label}</span>
                                    {candidate.id === provider.id && (
                                        <CheckIcon className='size-4 text-primary' />
                                    )}
                                </ResponsiveDropdownMenuItem>
                            ))}
                        </ResponsiveDropdownMenuContent>
                    </ResponsiveDropdownMenu>
                </Field>

                <Field>
                    <FieldLabel htmlFor='ai-api-key'>API key</FieldLabel>
                    <div className='flex items-center gap-1.5'>
                        <Input
                            id='ai-api-key'
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={event => setApiKey(event.target.value)}
                            placeholder={provider.keyPlaceholder}
                            autoComplete='off'
                        />
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
                            onClick={() => setShowKey(current => !current)}
                        >
                            {showKey ? <EyeSlashIcon /> : <EyeIcon />}
                        </Button>
                    </div>
                    <FieldDescription>
                        Consíguela en{' '}
                        <a
                            href={provider.keysUrl}
                            target='_blank'
                            rel='noreferrer'
                            className='underline'
                        >
                            {provider.keysUrl}
                        </a>
                        .
                    </FieldDescription>
                </Field>

                <Field>
                    <FieldLabel htmlFor='ai-model'>Modelo</FieldLabel>
                    <Input
                        id='ai-model'
                        value={ai.model ?? ''}
                        onChange={event => setModel(event.target.value)}
                        placeholder={provider.modelPlaceholder}
                    />
                    <FieldDescription>
                        Déjalo vacío para usar "{provider.modelPlaceholder}".
                    </FieldDescription>
                </Field>
            </FieldGroup>

            <p className='text-xs text-muted-foreground'>
                Tu API key se guarda solo en este navegador (localStorage) — nunca se sube a la base
                de datos ni a nuestros servidores, solo se usa para llamar directamente al proveedor
                que elijas.
            </p>
        </div>
    );
};
