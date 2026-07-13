'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SignOutIcon, GearIcon, CaretUpDownIcon } from '@phosphor-icons/react/ssr';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { SidebarMenuButton } from '@/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery } from '@/queries/profiles';
import { getAvatarUrl } from '@/helpers/avatar';

export const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const { data: profile } = useQuery(profileQuery(user?.id, { enabled: !!user }));

    if (!profile) return null;

    return (
        <DropdownMenu data-block='ProfileMenu'>
            <DropdownMenuTrigger render={<SidebarMenuButton size='lg' />}>
                <Avatar
                    className='size-6 bg-(--profile-color)'
                    style={{ '--profile-color': profile.color }}
                >
                    <AvatarImage
                        src={getAvatarUrl(profile.avatar_seed, profile.gender)}
                        alt={profile.name}
                    />
                    <AvatarFallback>{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className='min-w-0 flex-1 truncate'>{profile.name}</span>
                <CaretUpDownIcon className='ml-auto text-muted-foreground' />
            </DropdownMenuTrigger>
            <DropdownMenuContent side='right' align='end' className='w-56'>
                <DropdownMenuLabel className='truncate font-normal text-foreground'>
                    {profile.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href='/settings' />}>
                    <GearIcon />
                    Ajustes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant='destructive' onClick={() => signOut()}>
                    <SignOutIcon />
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
