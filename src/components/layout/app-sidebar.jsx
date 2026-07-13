'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, TruckIcon, GearIcon } from '@phosphor-icons/react/ssr';
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
    { href: '/', label: 'Casas', icon: HouseIcon, match: /^\/$|^\/(workspace|location)(\/|$)/ },
    { href: '/moves', label: 'Mudanzas', icon: TruckIcon, match: /^\/moves(\/|$)/ },
    { href: '/settings', label: 'Ajustes', icon: GearIcon, match: /^\/settings(\/|$)/ },
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
