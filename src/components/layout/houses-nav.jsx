'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/ui/sidebar';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { getLocationIcon } from '@/helpers/location';
import { workspacesQuery } from '@/queries/workspaces';
import { locationChildrenQuery } from '@/queries/locations';

// One level of rooms under each house — enough for quick jumps from the
// sidebar, not a full tree (that's what the location browser itself is for).
const HouseNavItem = ({ house, workspaceId, pathname }) => {
    const { data: rooms } = useQuery(locationChildrenQuery({ workspaceId, parentId: house.id }));

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                tooltip={house.name}
                isActive={pathname === `/location/${house.id}`}
                render={<Link href={`/location/${house.id}`} />}
            >
                <DynamicIcon icon={getLocationIcon(house)} />
                <span className='truncate'>{house.name}</span>
            </SidebarMenuButton>
            {rooms?.length > 0 && (
                <SidebarMenuSub>
                    {rooms.map(room => (
                        <SidebarMenuSubItem key={room.id}>
                            <SidebarMenuSubButton
                                isActive={pathname === `/location/${room.id}`}
                                render={<Link href={`/location/${room.id}`} />}
                            >
                                <DynamicIcon icon={getLocationIcon(room)} />
                                <span className='truncate'>{room.name}</span>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    );
};

export const HousesNav = () => {
    const pathname = usePathname();
    const { data: workspaces } = useQuery(workspacesQuery());

    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const { data: houses } = useQuery(
        locationChildrenQuery(
            { workspaceId: workspace?.id, parentId: null },
            { enabled: !!workspace },
        ),
    );

    if (!workspace || !houses?.length) return null;

    return (
        <SidebarGroup data-block='HousesNav'>
            <SidebarGroupLabel render={<Link href='/' />}>Casas</SidebarGroupLabel>
            <SidebarMenu>
                {houses.map(house => (
                    <HouseNavItem
                        key={house.id}
                        house={house}
                        workspaceId={workspace.id}
                        pathname={pathname}
                    />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
};
