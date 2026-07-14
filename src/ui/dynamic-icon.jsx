import { icons as lucideIcons, Icon as LucideIconBase } from 'lucide-react';
import * as lucideLab from '@lucide/lab';
import { HugeiconsIcon } from '@hugeicons/react';
import * as hugeIcons from '@hugeicons/core-free-icons';
// `/ssr` build per Phosphor's own Next.js guidance — the default entry isn't
// SSR-safe (hydration mismatches from a browser-only context internally).
import * as phosphorIcons from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';

// One resolver per supported icon set, all normalized to accept the same
// {name, ...props} shape so DynamicIcon can dispatch on `library` alone.
const iconSets = {
    lucide: ({ name, ...props }) => {
        const LucideIcon = lucideIcons[name];
        if (!LucideIcon) return null;
        return <LucideIcon {...props} />;
    },
    'lucide-lab': ({ name, ...props }) => {
        const iconNode = lucideLab[name];
        if (!iconNode) return null;
        return <LucideIconBase iconNode={iconNode} {...props} />;
    },
    huge: ({ name, ...props }) => {
        const icon = hugeIcons[name];
        if (!icon) return null;
        return <HugeiconsIcon icon={icon} {...props} />;
    },
    // Names use the `XxxIcon` suffix, matching the `huge` set's convention —
    // phosphor exports each icon both bare (`House`) and suffixed (`HouseIcon`).
    phosphor: ({ name, ...props }) => {
        const PhosphorIcon = phosphorIcons[name];
        if (!PhosphorIcon) return null;
        return <PhosphorIcon {...props} />;
    },
};

// Resolves the `icon` jsonb `{library, name}` shape used by locations, items
// and tags into a rendered icon, regardless of which set it was picked from.
//
// Default size is forced here rather than left to each library's own
// fallback: unset, Phosphor renders at `1em` (font-relative, ~14-16px in most
// of our text sizes) while Hugeicons/Lucide fall back to a fixed 24px — the
// same {library:'huge'} vs {library:'phosphor'} icon would visibly differ in
// size wherever a caller (or its ambient CSS) didn't set an explicit size-*
// class, e.g. dropdown option rows. `cn()` still lets an explicit className
// win via twMerge, so this only fills the gap, never overrides.
export const DynamicIcon = ({ icon, className, ...props }) => {
    if (!icon?.name) return null;
    const render = iconSets[icon.library ?? 'lucide'];
    if (!render) return null;
    // `icon.props` carries per-icon rendering defaults (e.g. a lighter
    // `strokeWidth` for a lucide icon standing in next to phosphor ones,
    // whose regular weight reads visually thinner at the same stroke) —
    // distinct from a call site's own `...props`, which still wins on conflict.
    return render({
        name: icon.name,
        className: cn('size-4', className),
        ...icon.props,
        ...props,
    });
};
