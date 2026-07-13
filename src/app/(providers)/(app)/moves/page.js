'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { PackageMovingIcon } from '@hugeicons/core-free-icons';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

export default function MovesPage() {
    return (
        <Empty className='flex-1' data-block='MovesPage'>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <HugeiconsIcon icon={PackageMovingIcon} />
                </EmptyMedia>
                <EmptyTitle>Mudanzas</EmptyTitle>
                <EmptyDescription>Todavía no está listo — próximamente.</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
