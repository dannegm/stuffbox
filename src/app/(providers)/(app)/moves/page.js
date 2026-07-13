'use client';

import { TruckIcon } from '@phosphor-icons/react/ssr';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

export default function MovesPage() {
    return (
        <Empty className='flex-1' data-block='MovesPage'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <TruckIcon />
                </EmptyMedia>
                <EmptyTitle>Mudanzas</EmptyTitle>
                <EmptyDescription>Todavía no está listo — próximamente.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
