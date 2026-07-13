'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon } from '@hugeicons/core-free-icons';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

export default function SettingsPage() {
    return (
        <Empty className='flex-1' data-block='SettingsPage'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <HugeiconsIcon icon={Settings02Icon} />
                </EmptyMedia>
                <EmptyTitle>Ajustes</EmptyTitle>
                <EmptyDescription>Todavía no está listo — próximamente.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
