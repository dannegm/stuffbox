'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { SidebarGroup } from '@/ui/sidebar';

// Submitting takes you to /search — filtering/paginating happens there, not
// inline in the sidebar. Hidden in collapsed-icon mode, same as SidebarGroup
// labels — a text input has nowhere to go in a size-8 icon rail.
export const SidebarSearch = () => {
    const router = useRouter();
    const [value, setValue] = useState('');

    const handleSubmit = event => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
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
                </InputGroup>
            </form>
        </SidebarGroup>
    );
};
