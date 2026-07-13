import { icons as lucideIcons, Icon as LucideIconBase } from 'lucide-react';
import * as lucideLab from '@lucide/lab';
import { HugeiconsIcon } from '@hugeicons/react';
import * as hugeIcons from '@hugeicons/core-free-icons';

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
};

// Resolves the `icon` jsonb `{library, name}` shape used by locations, items
// and tags into a rendered icon, regardless of which set it was picked from.
export const DynamicIcon = ({ icon, ...props }) => {
    if (!icon?.name) return null;
    const render = iconSets[icon.library ?? 'lucide'];
    if (!render) return null;
    return render({ name: icon.name, ...props });
};
