'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTitle } from '@/hooks/use-page-title';
import { Spinner } from '@/ui/spinner';

// Short QR-friendly alias for /item/[id] — a denser QR scans more reliably
// off a small printed label than the full path would.
export default function ShortItemRedirect({ params }) {
    const { id } = use(params);
    const router = useRouter();
    usePageTitle('Abriendo artículo…');

    useEffect(() => {
        router.replace(`/item/${id}`);
    }, [router, id]);

    return (
        <div className='flex flex-1 items-center justify-center' data-block='ShortItemRedirect'>
            <Spinner className='size-6' />
        </div>
    );
}
