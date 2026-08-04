'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from '@phosphor-icons/react/ssr';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupAction,
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
import { itemQuery } from '@/queries/items';
import { cn } from '@/helpers/utils';

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
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
                        'group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent',
                        { 'bg-sidebar-primary/12 text-sidebar-primary': isActiveHouse },
                    )}
                >
                    <DynamicIcon icon={getLocationIcon(house)} />
                </span>
                <span className='truncate'>{house.name}</span>
            </SidebarMenuButton>
            {isActiveHouse && rooms?.length > 0 && (
                <SidebarMenuSub>
                    {rooms.map(room => {
                        const isActiveRoom = room.id === activeRoomId;
                        return (
                            <SidebarMenuSubItem key={room.id}>
                                <SidebarMenuSubButton
                                    isActive={isActiveRoom}
                                    render={<Link href={`/location/${room.id}`} />}
                                >
                                    <DynamicIcon
                                        icon={getLocationIcon(room)}
                                        className={cn({ 'text-sidebar-primary': isActiveRoom })}
                                    />
                                    <span className='truncate'>{room.name}</span>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    );
};

export const HousesNav = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
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
    // Item create/edit pages don't have a location id in their own path, so
    // resolve one indirectly: /item/new carries it as a `?location=` query
    // param, /item/[id] needs the item fetched first for its location_id.
    const locationPageId = pathname.match(/^\/location\/([^/]+)/)?.[1];
    const itemPageId = pathname.match(/^\/item\/([^/]+)/)?.[1];
    const isNewItemPage = itemPageId === 'new';

    const { data: activeItem } = useQuery(
        itemQuery(itemPageId, { enabled: !!itemPageId && !isNewItemPage }),
    );

    const activeLocationId =
        locationPageId ?? (isNewItemPage ? searchParams.get('location') : activeItem?.location_id);

    const { data: activeChain } = useQuery(
        locationAncestorsQuery(activeLocationId, { enabled: !!activeLocationId }),
    );
    const activeHouseId = activeChain?.[0]?.id;
    const activeRoomId = activeChain?.length > 1 ? activeChain[1].id : undefined;

    if (!workspace) return null;

    return (
        <SidebarGroup data-block='HousesNav'>
            <SidebarGroupLabel render={<Link href='/' />}>Ubicaciones</SidebarGroupLabel>
            <SidebarGroupAction
                title='Crear ubicación'
                render={<Link href={`/house/new?workspace=${workspace.id}`} />}
            >
                <PlusIcon />
            </SidebarGroupAction>
            <SidebarMenu>
                {houses?.map(house => (
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
