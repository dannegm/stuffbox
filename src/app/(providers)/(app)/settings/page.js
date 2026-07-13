'use client';

import { GearIcon } from '@phosphor-icons/react/ssr';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

export default function SettingsPage() {
    return (
        <Empty className='flex-1' data-block='SettingsPage'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <GearIcon />
                </EmptyMedia>
                <EmptyTitle>Ajustes</EmptyTitle>
                <EmptyDescription>Todavía no está listo — próximamente.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
