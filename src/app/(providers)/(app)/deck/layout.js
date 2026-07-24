export const viewport = {
    // Swipe gestures fight the browser's own pinch/double-tap zoom on
    // mobile — scoped to this route only via App Router's per-segment
    // viewport export, the root layout's viewport stays untouched.
    maximumScale: 1,
    userScalable: false,
};

export default function DeckLayout({ children }) {
    return children;
}
