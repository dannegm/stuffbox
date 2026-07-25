'use client';

import { useSearchParams } from 'next/navigation';
import { parseUA } from '@/helpers/ua-parser';
import { DummyView } from '@/components/system/dummy-view';

const isHeadless = () => navigator.webdriver || parseUA(navigator.userAgent).device === 'bot';

// Vercel's OG-image/link-preview crawler runs a real headless Chrome that
// executes our JS like any visitor — without this gate it would silently
// trigger real writes (account provisioning, redirects) on every deploy or
// share. Sits right before AuthProvider so bots never reach it.
// `?forceBot=1` lets /playground preview this branch from inside an iframe
// without needing an actual headless session.
export const HeadlessGuard = ({ children }) => {
    const searchParams = useSearchParams();

    if (searchParams.get('forceBot') === '1' || isHeadless()) return <DummyView />;
    return children;
};
