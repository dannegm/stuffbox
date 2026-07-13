'use client';

import { useEffect, useState } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { createProviders } from '@/helpers/providers';
import { QueryProvider } from './query-provider';
import { BusProvider } from './bus-provider';
import { DeviceProvider } from './device-provider';
import { DebugProvider } from './debug-provider';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';

// 'use client' alone doesn't skip SSR — a client component still pre-renders
// on the server and hydrates, which is where hydration errors come from.
// Gating on mount forces this whole subtree (event bus, window-dependent
// providers, etc.) to only ever run in the browser.
const ClientComponent = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return children;
};

const AppProviders = createProviders([
    [QueryProvider],
    [NuqsAdapter],
    [BusProvider],
    [DeviceProvider],
    [DebugProvider],
    [ThemeProvider],
    [AuthProvider],
]);

export const Providers = ({ children }) => (
    <ClientComponent>
        <AppProviders>{children}</AppProviders>
    </ClientComponent>
);
