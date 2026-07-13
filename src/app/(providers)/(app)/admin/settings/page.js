'use client';

import { useMutation } from '@tanstack/react-query';
import { BroomIcon, BugIcon, DatabaseIcon } from '@phosphor-icons/react/ssr';
import { useSettings } from '@/hooks/use-settings';
import { optimizeStorage } from '@/services/uploads';
import { Field, FieldGroup, FieldContent, FieldLabel, FieldDescription } from '@/ui/field';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

export default function AdminSettingsPage() {
    const [debug, setDebug] = useSettings('debug', false);

    const {
        mutate: optimize,
        isPending,
        data: result,
    } = useMutation({ mutationFn: optimizeStorage });

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
        </div>
    );
}
