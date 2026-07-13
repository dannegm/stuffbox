'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { House03Icon, PackageMovingIcon, Settings02Icon } from '@hugeicons/core-free-icons';
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
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProfileMenu } from '@/components/layout/profile-menu';

const NAV_ITEMS = [
    { href: '/', label: 'Casas', icon: House03Icon, match: /^\/$|^\/(workspace|location)(\/|$)/ },
    { href: '/moves', label: 'Mudanzas', icon: PackageMovingIcon, match: /^\/moves(\/|$)/ },
    { href: '/settings', label: 'Ajustes', icon: Settings02Icon, match: /^\/settings(\/|$)/ },
];

export const AppSidebar = () => {
    const pathname = usePathname();

    return (
        <Sidebar collapsible='icon' data-block='AppSidebar'>
            <SidebarHeader>
                <WorkspaceSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {NAV_ITEMS.map(item => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    tooltip={item.label}
                                    isActive={item.match.test(pathname)}
                                    render={<Link href={item.href} />}
                                >
                                    <HugeiconsIcon icon={item.icon} />
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
