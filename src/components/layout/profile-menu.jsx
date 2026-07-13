'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SignOutIcon, PencilSimpleIcon } from '@phosphor-icons/react/ssr';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery } from '@/queries/profiles';
import { getAvatarUrl } from '@/helpers/avatar';

// A plain card, not a dropdown — "editar" and "cerrar sesión" are both a
// single click away instead of hidden behind a menu.
export const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const { data: profile } = useQuery(profileQuery(user?.id, { enabled: !!user }));

    if (!profile) return null;

    return (
        <div
            className='flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0'
            data-block='ProfileMenu'
        >
            <Avatar
                className='size-8 shrink-0 bg-(--profile-color)'
                style={{ '--profile-color': profile.color }}
            >
                <AvatarImage
                    src={getAvatarUrl(profile.avatar_seed, profile.gender)}
                    alt={profile.name}
                />
                <AvatarFallback>{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
                <p className='truncate font-heading text-sm font-semibold'>{profile.name}</p>
                <p className='truncate text-xs text-muted-foreground'>{profile.email}</p>
            </div>
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Button size='icon-sm' variant='ghost' render={<Link href='/profile' />} />
                    }
                >
                    <PencilSimpleIcon />
                </TooltipTrigger>
                <TooltipContent side='top'>Editar perfil</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger
                    render={<Button size='icon-sm' variant='ghost' onClick={() => signOut()} />}
                >
                    <SignOutIcon />
                </TooltipTrigger>
                <TooltipContent side='top'>Cerrar sesión</TooltipContent>
            </Tooltip>
        </div>
    );
};
