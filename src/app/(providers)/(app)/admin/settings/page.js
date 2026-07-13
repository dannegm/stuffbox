'use client';

import { useMutation } from '@tanstack/react-query';
import { BroomIcon } from '@phosphor-icons/react/ssr';
import { useSettings } from '@/hooks/use-settings';
import { optimizeStorage } from '@/services/uploads';
import { Field, FieldGroup, FieldContent, FieldLabel, FieldDescription } from '@/ui/field';
import { Switch } from '@/ui/switch';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Separator } from '@/ui/separator';

export default function AdminSettingsPage() {
    const [debug, setDebug] = useSettings('debug', false);

    const {
        mutate: optimize,
        isPending,
        data: result,
    } = useMutation({ mutationFn: optimizeStorage });

    return (
        <div className='mx-auto flex w-full max-w-lg flex-col gap-6' data-block='AdminSettingsPage'>
            <FieldGroup>
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

            <Separator />

            <FieldGroup>
                <Field>
                    <FieldLabel>Optimizar almacenamiento</FieldLabel>
                    <FieldDescription>
                        Busca fotos en R2 que ya no estén referenciadas por ningún item o location
                        (subidas interrumpidas, elementos borrados) y las elimina.
                    </FieldDescription>
                    <Button
                        type='button'
                        variant='outline'
                        className='self-start'
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
                            Se eliminaron {result.deletedCount} de {result.totalObjects} objetos.
                        </FieldDescription>
                    )}
                </Field>
            </FieldGroup>
        </div>
    );
}
