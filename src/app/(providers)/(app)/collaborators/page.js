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
    UsersIcon,
    LinkSimpleIcon,
    CheckIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { workspacesQuery } from '@/queries/workspaces';
import { workspaceSettingQuery } from '@/queries/workspace-settings';
import {
    workspaceMembersQuery,
    workspaceInvitesQuery,
    createWorkspaceInviteMutation,
    deleteWorkspaceInviteMutation,
    removeWorkspaceMemberMutation,
} from '@/queries/collaborators';
import { getAvatarUrl } from '@/helpers/avatar';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
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
import { cn } from '@/helpers/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const INVITE_FORM_ID = 'invite-form';

const EXPIRY_OPTIONS = [
    { value: '1', label: '1 día' },
    { value: '7', label: '7 días' },
    { value: '30', label: '30 días' },
];

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='CollaboratorsLoading'
    >
        <Skeleton className='h-28 w-full rounded-2xl' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-16 w-full rounded-xl' />
            <Skeleton className='h-16 w-full rounded-xl' />
        </div>
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

// The copy action gets real weight here (a full-width primary button, not a
// plain link) — this row is often the entire "how do I invite someone" UI
// for a workspace, so the CTA should read as one, not as an afterthought
// next to the link text.
const InviteRow = ({ invite, onDelete, canDelete }) => {
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
        <div
            className='flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'
            data-block='InviteRow'
        >
            <div className='flex items-center gap-3'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-flourish/15 text-flourish [&_svg]:size-4'>
                    <LinkSimpleIcon />
                </span>
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
            </div>
            <div className='flex items-center gap-2'>
                <Button
                    size='sm'
                    onClick={handleCopy}
                    className={cn({ 'flex-1': canDelete, 'w-full': !canDelete })}
                >
                    {copied ? (
                        <CheckIcon data-icon='inline-start' />
                    ) : (
                        <CopyIcon data-icon='inline-start' />
                    )}
                    {copied ? 'Copiado' : 'Copiar enlace'}
                </Button>
                {canDelete && (
                    <Button
                        size='icon-sm'
                        variant='outline'
                        onClick={() => onDelete(invite.id)}
                        aria-label='Eliminar invitación'
                    >
                        <TrashIcon />
                    </Button>
                )}
            </div>
        </div>
    );
};

const MemberRow = ({ member, isOwnerRow, isSelf, canRemove, onRemove }) => {
    const profile = member.profiles;
    return (
        <div
            className='flex items-center gap-3 rounded-xl border bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/5'
            data-block='MemberRow'
        >
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
            {isOwnerRow && (
                <span className='flex shrink-0 items-center gap-1 rounded-full bg-flourish/15 px-2 py-0.5 text-xs font-medium text-flourish'>
                    <CrownSimpleIcon className='size-3' weight='fill' />
                    <span className='hidden sm:inline'>Dueño</span>
                </span>
            )}
            {canRemove && (
                <Button
                    size='icon-sm'
                    variant='outline'
                    onClick={onRemove}
                    aria-label={isSelf ? 'Salir del espacio' : 'Quitar miembro'}
                >
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
    const confirm = useConfirm();
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
    const { data: collaborationSettings, isPending: isCollabPending } = useQuery(
        workspaceSettingQuery(workspace?.id, 'collaborationSettings', { enabled: !!workspace }),
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

    const handleRemoveMember = async member => {
        const isSelf = member.user_id === user?.id;
        const title = isSelf
            ? '¿Salir de este espacio?'
            : `¿Quitar a ${member.profiles.name} de este espacio?`;
        const ok = await confirm({
            title,
            confirmLabel: isSelf ? 'Salir' : 'Quitar',
            variant: 'destructive',
            // No clear "name" for leaving your own membership — falls back
            // to the word, same as every nameless delete action elsewhere.
            confirmText: isSelf ? 'eliminar' : member.profiles.name,
        });
        if (!ok) return;
        removeMember({ workspaceId: workspace?.id, userId: member.user_id });
    };

    // Previously fired deleteInvite with no confirmation at all — brought in
    // line with every other destructive delete in the app.
    const handleDeleteInvite = async inviteId => {
        const ok = await confirm({
            title: '¿Eliminar esta invitación?',
            description: 'El enlace deja de funcionar de inmediato.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: 'eliminar',
        });
        if (!ok) return;
        deleteInvite(inviteId);
    };

    if (
        isAuthLoading ||
        !user ||
        isWorkspacesPending ||
        !workspace ||
        isMembersPending ||
        !members ||
        isInvitesPending ||
        !invites ||
        isCollabPending
    ) {
        return <Loading />;
    }

    const isOwner = workspace.owner_id === user.id;
    // The owner always can; a regular member only when the owner has turned
    // the corresponding collaborationSettings toggle on (RLS enforces both
    // regardless of what the UI shows — see migrations/014).
    const canInvite = isOwner || !!collaborationSettings?.allowMemberInvites;
    const canRemoveOthers = isOwner || !!collaborationSettings?.allowMemberRemove;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='CollaboratorsPage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-5 ring-1 ring-foreground/10'
                data-block='CollaboratorsHero'
            >
                <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Colaboradores
                        </p>
                        <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                            {workspace.name}
                        </h1>
                    </div>
                    {canInvite && (
                        <Button
                            size='sm'
                            variant='outline'
                            className='shrink-0'
                            onClick={() => setInviteDialogOpen(true)}
                        >
                            <PlusIcon data-icon='inline-start' />
                            Invitar
                        </Button>
                    )}
                </div>

                <div className='mt-5 flex flex-wrap items-center gap-x-6 gap-y-3'>
                    <Stat icon={UsersIcon} value={members.length} label='colaboradores' />
                    <AvatarGroup className='ml-auto'>
                        {members.slice(0, 4).map(member => (
                            <Avatar
                                key={member.user_id}
                                size='sm'
                                className='bg-(--profile-color)'
                                style={{ '--profile-color': member.profiles?.color }}
                            >
                                <AvatarImage
                                    src={getAvatarUrl(
                                        member.profiles?.avatar_seed,
                                        member.profiles?.gender,
                                    )}
                                    alt={member.profiles?.name ?? ''}
                                />
                                <AvatarFallback>
                                    {member.profiles?.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                        {members.length > 4 && (
                            <AvatarGroupCount>+{members.length - 4}</AvatarGroupCount>
                        )}
                    </AvatarGroup>
                </div>
            </div>

            <div className='flex flex-col gap-2'>
                <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    Miembros
                </h2>
                {members.map(member => {
                    const isOwnerRow = member.user_id === workspace.owner_id;
                    const isSelf = member.user_id === user.id;
                    // The owner can never be removed, including by
                    // themselves — they leave by deleting the workspace
                    // instead (Settings), never by "leaving" it.
                    const canRemove = !isOwnerRow && (isSelf || canRemoveOthers);
                    return (
                        <MemberRow
                            key={member.user_id}
                            member={member}
                            isOwnerRow={isOwnerRow}
                            isSelf={isSelf}
                            canRemove={canRemove}
                            onRemove={() => handleRemoveMember(member)}
                        />
                    );
                })}
            </div>

            {canInvite && (
                <>
                    <Separator />
                    <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                        Invitaciones
                    </h2>
                    {invites.length === 0 ? (
                        <Empty className='py-8' data-block='InvitesEmpty'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon' className='bg-flourish/15 text-flourish'>
                                    <LinkSimpleIcon />
                                </EmptyMedia>
                                <EmptyTitle>Sin invitaciones activas</EmptyTitle>
                                <EmptyDescription>
                                    Genera un enlace para invitar a alguien a este espacio.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className='flex flex-col gap-2'>
                            {invites.map(invite => (
                                <InviteRow
                                    key={invite.id}
                                    invite={invite}
                                    onDelete={handleDeleteInvite}
                                    canDelete={isOwner}
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
