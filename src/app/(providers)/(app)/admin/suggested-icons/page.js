'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SparkleIcon } from '@phosphor-icons/react/ssr';
import { appSettingQuery, setAppSettingMutation, SUGGESTED_ICONS_KEY } from '@/queries/app-settings';
import { IconMultiSelect } from '@/ui/icon-multi-select';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { FieldDescription } from '@/ui/field';

export default function AdminSuggestedIconsPage() {
    const queryClient = useQueryClient();
    const [icons, setIcons] = useState([]);

    const { data: savedIcons, isPending } = useQuery(appSettingQuery(SUGGESTED_ICONS_KEY));

    useEffect(() => {
        if (savedIcons) setIcons(savedIcons);
    }, [savedIcons]);

    const { mutate: save, isPending: isSaving } = useMutation(
        setAppSettingMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-setting', SUGGESTED_ICONS_KEY] }),
        }),
    );

    const handleSave = () => save({ key: SUGGESTED_ICONS_KEY, value: icons });

    if (isPending) return null;

    return (
        <div className='mx-auto flex w-full max-w-lg flex-col gap-4' data-block='AdminSuggestedIconsPage'>
            <div className='flex items-start gap-3'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-flourish/15 text-flourish [&_svg]:size-4.5'>
                    <SparkleIcon />
                </span>
                <div>
                    <h2 className='font-heading text-lg font-semibold tracking-tight'>
                        Íconos sugeridos
                    </h2>
                    <FieldDescription>
                        Estos íconos aparecen sugeridos en el selector de íconos de toda la app,
                        además de los sugeridos por tags y los usados frecuentemente.
                    </FieldDescription>
                </div>
            </div>

            <div
                className='flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
                data-block='AdminSuggestedIconsCard'
            >
                <IconMultiSelect value={icons} onChange={setIcons} />
                <Button
                    type='button'
                    className='self-start'
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </div>
        </div>
    );
}
