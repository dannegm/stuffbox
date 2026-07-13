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

const NAV_ITEMS = [
    { href: '/moves', label: 'Mudanzas', icon: TruckIcon, match: /^\/moves(\/|$)/ },
    { href: '/tags', label: 'Tags', icon: TagIcon, match: /^\/tags(\/|$)/ },
    {
        href: '/collaborators',
        label: 'Colaboradores',
        icon: UsersIcon,
        match: /^\/collaborators(\/|$)/,
    },
];

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
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <HousesNav />
                <SidebarGroup>
                    <SidebarMenu>
                        {[...NAV_ITEMS, settingsItem, adminItem].filter(Boolean).map(item => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    tooltip={item.label}
                                    isActive={item.match.test(pathname)}
                                    render={<Link href={item.href} />}
                                >
                                    <item.icon />
                                    <span>{item.label}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
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
