import { DummyView } from '@/components/system/dummy-view';

export const metadata = { title: 'Dummy | Stuffbox' };

// Direct look at whatever a headless crawler sees when HeadlessGuard trips —
// a normal browser hitting this route isn't flagged as a bot, so it just
// falls through to this page, which renders the same fallback on purpose.
export default function DummyPage() {
    return <DummyView />;
}
