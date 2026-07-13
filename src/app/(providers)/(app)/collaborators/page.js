'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    PlusIcon,
    CopyIcon,
    TrashIcon,
    SignOutIcon,
    CrownSimpleIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import {
    workspaceMembersQuery,
    workspaceInvitesQuery,
    createWorkspaceInviteMutation,
    deleteWorkspaceInviteMutation,
    removeWorkspaceMemberMutation,
} from '@/queries/collaborators';
import { getAvatarUrl } from '@/helpers/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { SelectSearch } from '@/ui/select-search';
import { Separator } from '@/ui/separator';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const INVITE_FORM_ID = 'invite-form';

const EXPIRY_OPTIONS = [
    { value: '1', label: '1 día' },
    { value: '7', label: '7 días' },
    { value: '30', label: '30 días' },
];

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='CollaboratorsLoading'>
        <Spinner className='size-6' />
    </div>
);

// No trigger of its own (controlled) — same reasoning as CreateWorkspaceDialog:
// this is opened from a plain button, not a menu item, so it doesn't strictly
// need to be, but keeping every dialog on this page the same shape.
const InviteDialog = ({ workspaceId, invitedBy, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const [maxUses, setMaxUses] = useState('1');
    const [expiryDays, setExpiryDays] = useState('7');

    useEffect(() => {
        if (!open) return;
        setMaxUses('1');
        setExpiryDays('7');
    }, [open]);

    const { mutate, isPending } = useMutation(
        createWorkspaceInviteMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
                onOpenChange(false);
            },
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        const expiresAt = new Date(
            Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000,
        ).toISOString();
        mutate({ workspaceId, invitedBy, maxUses: Number(maxUses) || 1, expiresAt });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='InviteDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Generar enlace de invitación</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form id={INVITE_FORM_ID} onSubmit={handleSubmit} className='px-4 sm:px-0'>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='invite-max-uses'>Usos máximos</FieldLabel>
                            <Input
                                id='invite-max-uses'
                                type='number'
                                min={1}
                                value={maxUses}
                                onChange={event => setMaxUses(event.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>Expira en</FieldLabel>
                            <SelectSearch
                                options={EXPIRY_OPTIONS}
                                value={expiryDays}
                                onChange={setExpiryDays}
                                getKey={option => option.value}
                                getLabel={option => option.label}
                            />
                        </Field>
                    </FieldGroup>
                </form>
                <ResponsiveDialogFooter>
                    <Button type='submit' form={INVITE_FORM_ID} disabled={isPending}>
                        {isPending && <Spinner data-icon='inline-start' />}
                        Generar
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};

const InviteRow = ({ invite, onDelete }) => {
    const [copied, setCopied] = useState(false);
    const link = `${APP_URL}/invite/${invite.token}`;
    const isExpired = new Date(invite.expires_at) < new Date();
    const isExhausted = invite.uses_count >= invite.max_uses;
    const isActive = !isExpired && !isExhausted;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className='flex items-center gap-3 rounded-lg border p-3 text-sm'>
            <div className='min-w-0 flex-1'>
                <p className='truncate font-mono text-xs'>{link}</p>
                <p className='truncate text-xs text-muted-foreground'>
                    {invite.uses_count}/{invite.max_uses} usos ·{' '}
                    {isActive
                        ? `expira ${new Date(invite.expires_at).toLocaleDateString('es-MX')}`
                        : isExpired
                          ? 'expirado'
                          : 'agotado'}
                </p>
            </div>
            <Button size='sm' variant='outline' onClick={handleCopy}>
                <CopyIcon data-icon='inline-start' />
                {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button size='icon-sm' variant='outline' onClick={() => onDelete(invite.id)}>
                <TrashIcon />
            </Button>
        </div>
    );
};

const MemberRow = ({ member, isOwnerRow, isSelf, canRemove, onRemove }) => {
    const profile = member.profiles;
    return (
        <div className='flex items-center gap-3 rounded-lg border p-3 text-sm'>
            <Avatar
                className='size-9 bg-(--profile-color)'
                style={{ '--profile-color': profile.color }}
            >
                <AvatarImage
                    src={getAvatarUrl(profile.avatar_seed, profile.gender)}
                    alt={profile.name}
                />
                <AvatarFallback>{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
                <p className='truncate font-medium'>
                    {profile.name}
                    {isSelf && <span className='text-muted-foreground'> (tú)</span>}
                </p>
                <p className='truncate text-xs text-muted-foreground'>{profile.email}</p>
            </div>
            {isOwnerRow && <CrownSimpleIcon className='size-4 shrink-0 text-muted-foreground' />}
            {canRemove && (
                <Button size='icon-sm' variant='outline' onClick={onRemove}>
                    {isSelf ? <SignOutIcon /> : <TrashIcon />}
                </Button>
            )}
        </div>
    );
};

export default function CollaboratorsPage() {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    // Same workspace-resolution pattern as tags/page.js and moves/page.js —
    // a plain top-level nav item, workspace comes from the active /workspace
    // path segment (if any) or just the first one, never a route param here.
    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const { data: members, isPending: isMembersPending } = useQuery(
        workspaceMembersQuery(workspace?.id, { enabled: !!workspace }),
    );
    const { data: invites, isPending: isInvitesPending } = useQuery(
        workspaceInvitesQuery(workspace?.id, { enabled: !!workspace }),
    );

    const { mutate: removeMember } = useMutation(
        removeWorkspaceMemberMutation({
            onSuccess: removedUserId => {
                queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace?.id] });
                if (removedUserId === user.id) router.replace('/');
            },
        }),
    );

    const { mutate: deleteInvite } = useMutation(
        deleteWorkspaceInviteMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspace?.id] }),
        }),
    );

    const handleRemoveMember = member => {
        const isSelf = member.user_id === user.id;
        const message = isSelf
            ? '¿Salir de este espacio?'
            : `¿Quitar a ${member.profiles.name} de este espacio?`;
        if (!window.confirm(message)) return;
        removeMember({ workspaceId: workspace.id, userId: member.user_id });
    };

    if (
        isAuthLoading ||
        !user ||
        isWorkspacesPending ||
        !workspace ||
        isMembersPending ||
        !members ||
        isInvitesPending ||
        !invites
    ) {
        return <Loading />;
    }

    const isOwner = workspace.owner_id === user.id;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='CollaboratorsPage'
        >
            <h1 className='truncate font-heading text-lg font-medium'>
                Colaboradores — {workspace.name}
            </h1>

            <div className='flex flex-col gap-2'>
                <h2 className='text-sm font-medium text-muted-foreground'>Miembros</h2>
                {members.map(member => (
                    <MemberRow
                        key={member.user_id}
                        member={member}
                        isOwnerRow={member.user_id === workspace.owner_id}
                        isSelf={member.user_id === user.id}
                        canRemove={
                            isOwner
                                ? member.user_id !== workspace.owner_id
                                : member.user_id === user.id
                        }
                        onRemove={() => handleRemoveMember(member)}
                    />
                ))}
            </div>

            {isOwner && (
                <>
                    <Separator />
                    <div className='flex items-center justify-between gap-2'>
                        <h2 className='text-sm font-medium text-muted-foreground'>Invitaciones</h2>
                        <Button size='sm' onClick={() => setInviteDialogOpen(true)}>
                            <PlusIcon data-icon='inline-start' />
                            Generar enlace
                        </Button>
                    </div>
                    {invites.length === 0 ? (
                        <p className='text-sm text-muted-foreground'>Sin invitaciones activas.</p>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            {invites.map(invite => (
                                <InviteRow
                                    key={invite.id}
                                    invite={invite}
                                    onDelete={deleteInvite}
                                />
                            ))}
                        </div>
                    )}
                    <InviteDialog
                        workspaceId={workspace.id}
                        invitedBy={user.id}
                        open={inviteDialogOpen}
                        onOpenChange={setInviteDialogOpen}
                    />
                </>
            )}
        </div>
    );
}
