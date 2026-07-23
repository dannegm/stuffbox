'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, ScanIcon } from '@phosphor-icons/react/ssr';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/ui/input-group';
import { SidebarGroup } from '@/ui/sidebar';
import { ScanSkuDialog } from '@/components/items/scan-sku-dialog';
import { parseSku } from '@/helpers/barcode';

// Submitting takes you to /search — filtering/paginating happens there, not
// inline in the sidebar. Hidden in collapsed-icon mode, same as SidebarGroup
// labels — a text input has nowhere to go in a size-8 icon rail.
export const SidebarSearch = () => {
    const router = useRouter();
    const [value, setValue] = useState('');
    const [isScanOpen, setIsScanOpen] = useState(false);

    const handleSubmit = event => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    };

    // Scanned values come back as `type|code` (see helpers/barcode.js) — only
    // the bare code is useful as a search term, since search_workspace's
    // `sku ilike` matches substrings and a manually-typed sku on some item
    // may not carry the same type prefix a scan would produce.
    const handleScan = scanned => {
        const { code } = parseSku(scanned);
        router.push(`/search?q=${encodeURIComponent(code)}`);
    };

    return (
        <SidebarGroup
            className='group-data-[collapsible=icon]:hidden'
            data-block='SidebarSearch'
        >
            <form onSubmit={handleSubmit}>
                <InputGroup>
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        placeholder='Buscar…'
                    />
                    <InputGroupAddon align='inline-end'>
                        <InputGroupButton
                            size='icon-xs'
                            aria-label='Escanear código'
                            onClick={() => setIsScanOpen(true)}
                        >
                            <ScanIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </form>
            <ScanSkuDialog open={isScanOpen} onOpenChange={setIsScanOpen} onScan={handleScan} />
        </SidebarGroup>
    );
};
