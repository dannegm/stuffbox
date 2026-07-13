'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    TruckIcon,
    TagIcon,
    UsersIcon,
    GearIcon,
    ShieldCheckIcon,
} from '@phosphor-icons/react/ssr';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/ui/sidebar';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { HousesNav } from '@/components/layout/houses-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { workspacesQuery } from '@/queries/workspaces';
import { useIsAdmin } from '@/hooks/use-admin';
import { cn } from '@/helpers/utils';

// `accent: 'flourish'` is reserved for Mudanzas — the one nav item where the
// warm brand accent earns its keep standing apart from the rest, which stay
// on the neutral violet (--sidebar-primary) active tint.
const NAV_ITEMS = [
    {
        href: '/moves',
        label: 'Mudanzas',
        icon: TruckIcon,
        match: /^\/moves(\/|$)/,
        accent: 'flourish',
    },
    { href: '/tags', label: 'Tags', icon: TagIcon, match: /^\/tags(\/|$)/ },
    {
        href: '/collaborators',
        label: 'Colaboradores',
        icon: UsersIcon,
        match: /^\/collaborators(\/|$)/,
    },
];

// Icon container shared by every top-level nav row — sized so it disappears
// cleanly in collapsed (`collapsible="icon"`) mode, where the button itself
// shrinks to a bare size-8 square and a bigger fixed-size wrapper would
// overflow it.
const NavIcon = ({ icon: Icon, active, accent }) => (
    <span
        className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
            'group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent',
            {
                'bg-flourish/15 text-flourish': active && accent === 'flourish',
                'bg-sidebar-primary/12 text-sidebar-primary': active && accent !== 'flourish',
            },
        )}
    >
        <Icon />
    </span>
);

export const AppSidebar = () => {
    const pathname = usePathname();
    const { data: workspaces } = useQuery(workspacesQuery());
    const { isAdmin } = useIsAdmin();

    // Ajustes here means *workspace* settings (per-workspace, not per-user —
    // that's /profile, reached from the profile card instead), so unlike the
    // other nav items it needs an actual workspace id in its href.
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const activeWorkspace =
        workspaces?.find(workspace => workspace.id === activeWorkspaceId) ?? workspaces?.[0];
    const settingsItem = activeWorkspace && {
        href: `/workspace/${activeWorkspace.id}/settings`,
        label: 'Ajustes',
        icon: GearIcon,
        match: /^\/workspace\/[^/]+\/settings(\/|$)/,
    };
    const adminItem = isAdmin && {
        href: '/admin',
        label: 'Admin',
        icon: ShieldCheckIcon,
        match: /^\/admin(\/|$)/,
    };

    return (
        <Sidebar collapsible='icon' data-block='AppSidebar'>
            <SidebarHeader className='bg-hero-mesh'>
                <WorkspaceSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <HousesNav />
                <SidebarSeparator />
                <SidebarGroup>
                    <SidebarMenu>
                        {[...NAV_ITEMS, settingsItem, adminItem].filter(Boolean).map(item => {
                            const active = item.match.test(pathname);
                            return (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        tooltip={item.label}
                                        isActive={active}
                                        render={<Link href={item.href} />}
                                    >
                                        <NavIcon
                                            icon={item.icon}
                                            active={active}
                                            accent={item.accent}
                                        />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarSeparator />
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <ThemeToggle />
                    </SidebarMenuItem>
                </SidebarMenu>
                <ProfileMenu />
            </SidebarFooter>
        </Sidebar>
    );
};
