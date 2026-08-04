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
    PlusIcon,
    CardsThreeIcon,
    HouseIcon,
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
import { SidebarSearch } from '@/components/layout/sidebar-search';
import { HousesNav } from '@/components/layout/houses-nav';
import { MovesNavItem } from '@/components/layout/moves-nav-item';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { workspacesQuery } from '@/queries/workspaces';
import { useIsAdmin } from '@/hooks/use-admin';
import { cn } from '@/helpers/utils';

// Rendered separately from NAV_ITEMS via MovesNavItem — it's the one row
// that expands in place into the workspace's individual moves, so it needs
// the active workspace passed in, unlike the rest of these plain links.
const MOVES_ITEM = {
    href: '/moves',
    label: 'Mudanzas',
    icon: TruckIcon,
    match: /^\/(moves|move)(\/|$)/,
};

// Rendered before MovesNavItem, same reason it's split out of NAV_ITEMS below —
// the sidebar order is Cards, Mudanzas, Tags, Colaboradores, Ajustes, and
// MovesNavItem has to land between Cards and Tags.
const CARDS_ITEM = { href: '/deck', label: 'Cards', icon: CardsThreeIcon, match: /^\/deck(\/|$)/ };

const NAV_ITEMS = [
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
const NavIcon = ({ icon: Icon, active }) => (
    <span
        className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
            'group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent',
            { 'bg-sidebar-primary/12 text-sidebar-primary': active },
        )}
    >
        <Icon />
    </span>
);

const NavItem = ({ item, active }) => (
    <SidebarMenuItem>
        <SidebarMenuButton tooltip={item.label} isActive={active} render={<Link href={item.href} />}>
            <NavIcon icon={item.icon} active={active} />
            <span>{item.label}</span>
        </SidebarMenuButton>
    </SidebarMenuItem>
);

// Admin gets a standout treatment (gradient wash across the two brand tokens)
// since it's the one nav row that isn't workspace-scoped and sits apart from
// the rest, pinned to the bottom of the content area right above the footer.
const AdminNavItem = ({ item, active }) => (
    <SidebarMenuItem>
        <SidebarMenuButton
            tooltip={item.label}
            isActive={active}
            render={<Link href={item.href} />}
            className={cn(
                'bg-gradient-to-r from-primary/15 via-primary/10 to-flourish/15 ring-1 ring-primary/15',
                'hover:from-primary/20 hover:via-primary/15 hover:to-flourish/20',
                { 'from-primary/25 via-primary/20 to-flourish/25 ring-primary/25': active },
            )}
        >
            <NavIcon icon={item.icon} active={active} />
            <span>{item.label}</span>
        </SidebarMenuButton>
    </SidebarMenuItem>
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
    // Everything workspace-scoped (search, houses, Mudanzas/Tags/Colaboradores,
    // Ajustes) only makes sense once a workspace actually exists — with none,
    // the sidebar collapses down to just the switcher, an "Añadir espacio"
    // shortcut, and whatever's workspace-independent (Admin, theme, profile).
    const hasWorkspace = !!activeWorkspace;
    const inicioItem = activeWorkspace && {
        href: `/workspace/${activeWorkspace.id}`,
        label: 'Inicio',
        icon: HouseIcon,
        match: /^\/workspace\/[^/]+\/?$/,
    };
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
                {hasWorkspace ? (
                    <>
                        <SidebarSearch />
                        <SidebarGroup>
                            <SidebarMenu>
                                <NavItem item={inicioItem} active={inicioItem.match.test(pathname)} />
                            </SidebarMenu>
                        </SidebarGroup>
                        <HousesNav />
                        <SidebarSeparator />
                        <SidebarGroup>
                            <SidebarMenu>
                                <NavItem item={CARDS_ITEM} active={CARDS_ITEM.match.test(pathname)} />
                                <MovesNavItem
                                    {...MOVES_ITEM}
                                    isActive={MOVES_ITEM.match.test(pathname)}
                                    workspace={activeWorkspace}
                                />
                                {[...NAV_ITEMS, settingsItem].filter(Boolean).map(item => (
                                    <NavItem key={item.href} item={item} active={item.match.test(pathname)} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                        {adminItem && (
                            <SidebarGroup className='mt-auto'>
                                <SidebarMenu>
                                    <AdminNavItem item={adminItem} active={adminItem.match.test(pathname)} />
                                </SidebarMenu>
                            </SidebarGroup>
                        )}
                    </>
                ) : (
                    <>
                        <SidebarGroup>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip='Añadir espacio'
                                        render={<Link href='/workspace/new' />}
                                        className='border border-dashed border-sidebar-primary/40 text-sidebar-primary hover:bg-sidebar-primary/10'
                                    >
                                        <NavIcon icon={PlusIcon} />
                                        <span>Añadir espacio</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                        {adminItem && (
                            <SidebarGroup className='mt-auto'>
                                <SidebarMenu>
                                    <AdminNavItem item={adminItem} active={adminItem.match.test(pathname)} />
                                </SidebarMenu>
                            </SidebarGroup>
                        )}
                    </>
                )}
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
