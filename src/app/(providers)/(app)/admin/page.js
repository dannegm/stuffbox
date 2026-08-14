'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTitle } from '@/hooks/use-page-title';

export default function AdminIndexPage() {
    const router = useRouter();
    usePageTitle('Admin');

    useEffect(() => {
        router.replace('/admin/workspaces');
    }, [router]);

    return null;
}
