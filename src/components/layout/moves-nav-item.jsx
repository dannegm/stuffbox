'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TruckIcon, AirplaneIcon } from '@phosphor-icons/react/ssr';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/ui/sidebar';
import { movesQuery } from '@/queries/moves';
import { getMoveStatusDot } from '@/constants/move-status';
import { cn } from '@/helpers/utils';

// The one "Mudanzas" row in the main nav list — not a separate sidebar
// section like HousesNav, just expands in place into the workspace's
// individual moves while the moves area (list/detail/any child route) is
// active, same collapsible shape as HouseNavItem's rooms.
export const MovesNavItem = ({ icon: Icon, label, href, isActive, workspace }) => {
    const pathname = usePathname();
    const { data: moves } = useQuery(
        movesQuery(workspace?.id, { enabled: isActive && !!workspace }),
    );
    const activeMoveId = pathname.match(/^\/move\/([^/]+)/)?.[1];

    return (
        <SidebarMenuItem>
            <SidebarMenuButton tooltip={label} isActive={isActive} render={<Link href={href} />}>
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
                        'group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent',
                        { 'bg-flourish/15 text-flourish': isActive },
                    )}
                >
                    <Icon />
                </span>
                <span>{label}</span>
            </SidebarMenuButton>
            {isActive && moves?.length > 0 && (
                <SidebarMenuSub>
                    {moves.map(move => {
                        const isActiveMove = move.id === activeMoveId;
                        const RouteIcon = move.route_type === 'air' ? AirplaneIcon : TruckIcon;
                        return (
                            <SidebarMenuSubItem key={move.id}>
                                <SidebarMenuSubButton
                                    isActive={isActiveMove}
                                    render={<Link href={`/move/${move.id}`} />}
                                >
                                    <RouteIcon className={cn({ 'text-flourish': isActiveMove })} />
                                    <span className='min-w-0 flex-1 truncate'>{move.name}</span>
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            getMoveStatusDot(move),
                                        )}
                                    />
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
            )}
        </SidebarMenuItem>
    );
};
