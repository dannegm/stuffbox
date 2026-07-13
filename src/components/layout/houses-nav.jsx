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
import { locationChildrenQuery, locationAncestorsQuery } from '@/queries/locations';

// One level of rooms under each house — enough for quick jumps from the
// sidebar, not a full tree (that's what the location browser itself is for).
// `isActiveHouse`/`activeRoomId` come from walking the *current* location's
// full parent chain up to its root (see HousesNav below), so this expands
// and highlights correctly no matter how deep we are (a box inside a room
// inside the house still resolves back to the right house + room).
const HouseNavItem = ({ house, workspaceId, isActiveHouse, activeRoomId }) => {
    const { data: rooms } = useQuery(locationChildrenQuery({ workspaceId, parentId: house.id }));

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                tooltip={house.name}
                isActive={isActiveHouse}
                render={<Link href={`/location/${house.id}`} />}
            >
                <DynamicIcon icon={getLocationIcon(house)} />
                <span className='truncate'>{house.name}</span>
            </SidebarMenuButton>
            {isActiveHouse && rooms?.length > 0 && (
                <SidebarMenuSub>
                    {rooms.map(room => (
                        <SidebarMenuSubItem key={room.id}>
                            <SidebarMenuSubButton
                                isActive={room.id === activeRoomId}
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

    // Full root-to-current chain for whatever location page is currently
    // open. locationAncestorsQuery walks parent_id up from whatever id you
    // give it — passing the *current* location's own id (not its parent_id)
    // means the returned array includes that location itself, root-first:
    // [house, room, ...deeper] regardless of how many levels down we are.
    const activeLocationId = pathname.match(/^\/location\/([^/]+)/)?.[1];
    const { data: activeChain } = useQuery(
        locationAncestorsQuery(activeLocationId, { enabled: !!activeLocationId }),
    );
    const activeHouseId = activeChain?.[0]?.id;
    const activeRoomId = activeChain?.length > 1 ? activeChain[1].id : undefined;

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
                        isActiveHouse={house.id === activeHouseId}
                        activeRoomId={activeRoomId}
                    />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
};
