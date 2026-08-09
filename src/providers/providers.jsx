'use client';

import { useEffect, useState } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { createProviders } from '@/helpers/providers';
import { TooltipProvider } from '@/ui/tooltip';
import { QueryProvider } from './query-provider';
import { BusProvider } from './bus-provider';
import { DeviceProvider } from './device-provider';
import { DebugProvider } from './debug-provider';
import { ThemeProvider } from './theme-provider';
import { HeadlessGuard } from './headless-guard';
import { AuthProvider } from './auth-provider';
import { ConfirmProvider } from './confirm-provider';
import { Toaster } from '@/ui/sonner';
import { BreakpointIndicator } from '@/components/debug/breakpoint-indicator';

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
    [HeadlessGuard],
    [AuthProvider],
    [TooltipProvider],
    [ConfirmProvider],
]);

// Toaster and BreakpointIndicator aren't context providers (they don't wrap
// children, they just render their own fixed-position portal/overlay), so
// they sit as siblings here instead of joining the AppProviders array — same
// mount-gated subtree as everything else, since both read settings via
// useSettings.
export const Providers = ({ children }) => (
    <ClientComponent>
        <AppProviders>{children}</AppProviders>
        <Toaster />
        <BreakpointIndicator />
    </ClientComponent>
);
