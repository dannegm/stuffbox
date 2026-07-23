'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LinkBreakIcon, UsersIcon } from '@phosphor-icons/react/ssr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { EmailCodeCard } from '@/components/auth/email-code-card';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase';
import { ensureAccountProvisioned } from '@/services/provision-account';
import { inviteLinks } from '@/services/invite-links';
import { workspacesQuery } from '@/queries/workspaces';
import { cn } from '@/helpers/utils';

const inviteQuery = token => ({
    queryKey: ['invite', token],
    queryFn: async () => {
        const { data, error } = await supabase().rpc('get_invite_by_token', { p_token: token });
        if (error) throw error;
        return data?.[0] ?? null;
    },
});

// Same hero-mesh stage as /login and /register — every state this page can
// land on (loading, invalid, already-signed-in, or the email/code form)
// renders inside it, so the invite link never lands on a bare screen.
const AuthShell = ({ children, accent = 'primary' }) => (
    <div
        className='relative flex min-h-svh flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-hero-mesh p-4 sm:p-6'
        data-block='InvitePage'
    >
        <div
            aria-hidden
            className={cn(
                'pointer-events-none absolute top-1/3 left-1/2 size-112 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:size-144',
                {
                    'bg-primary/10': accent === 'primary',
                    'bg-destructive/10': accent === 'destructive',
                },
            )}
        />

        <div className='relative flex flex-col items-center gap-1.5 text-center'>
            <h1 className='font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                Stuffbox
            </h1>
            <p className='max-w-2xs text-sm text-muted-foreground sm:max-w-xs'>
                Organiza cada rincón de tu hogar, en equipo.
            </p>
        </div>

        <div className='relative flex w-full max-w-sm flex-col items-center gap-4'>{children}</div>
    </div>
);

const Loading = ({ label = 'Cargando invitación…' }) => (
    <AuthShell>
        <div className='flex flex-col items-center gap-3 text-muted-foreground'>
            <Spinner className='size-6' />
            <p className='text-xs'>{label}</p>
        </div>
    </AuthShell>
);

const InvalidInviteCard = () => (
    <AuthShell accent='destructive'>
        <Card
            className='relative w-full max-w-sm gap-5 overflow-hidden rounded-2xl border-t-4 border-destructive/40 shadow-lg shadow-destructive/10'
            data-block='InvalidInviteCard'
        >
            <CardHeader className='items-center gap-3 text-center'>
                <span className='mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive [&_svg]:size-5'>
                    <LinkBreakIcon weight='bold' />
                </span>
                <div>
                    <CardTitle>Invitación no válida</CardTitle>
                    <CardDescription className='mt-1 text-pretty'>
                        Este enlace venció o ya se usó. Pide uno nuevo a quien te invitó.
                    </CardDescription>
                </div>
            </CardHeader>
        </Card>
    </AuthShell>
);

export default function InvitePage({ params }) {
    const { token } = use(params);
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState(null);

    const { data: invite, isPending: isInvitePending } = useQuery(inviteQuery(token));
    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );

    // Tracked locally (not the DB) — a visitor who already joined through
    // this exact link before gets no confirmation screen at all on repeat
    // visits, even if the invite row itself has since expired or been
    // deleted: the link becomes a direct shortcut back into the workspace.
    const cachedWorkspaceId = inviteLinks.get(token);
    const hasCachedWorkspaceId = !!cachedWorkspaceId;

    // Only knowable once workspaces finishes loading — the cache only proves
    // "you joined this workspace before," not that you still belong to it
    // (an owner may have removed you since). `workspaces` already only lists
    // memberships RLS still grants, so checking against it catches a stale
    // entry left over from a removed member. Split into three explicit
    // states rather than one boolean so the redirect below only ever fires
    // once membership is actually confirmed, never while still checking —
    // otherwise a since-removed member would get bounced to the workspace
    // before its own staleness check ever got a chance to run.
    const isVerifyingCachedMembership = !!user && hasCachedWorkspaceId && isWorkspacesPending;
    const isStillMemberOfCached =
        hasCachedWorkspaceId &&
        !isWorkspacesPending &&
        !!workspaces?.some(workspace => workspace.id === cachedWorkspaceId);
    const cacheIsStale =
        !!user && hasCachedWorkspaceId && !isWorkspacesPending && !isStillMemberOfCached;

    // Confirmed valid cache hit — no confirmation screen, straight into the
    // workspace.
    const alreadyJoined = !!user && hasCachedWorkspaceId && isStillMemberOfCached;

    const fallbackWorkspaceId = workspaces?.[0]?.id ?? null;

    // Two situations land here, same outcome: a dead invite this browser
    // never used (nothing to confirm), or a cache that turned out to be
    // stale (removed from that workspace since). Either way: drop them on
    // another workspace they still belong to, or send them to create a new
    // one if they have none at all.
    const needsInvalidFallback = !!user && !isInvitePending && !invite?.valid && !hasCachedWorkspaceId;
    const needsFallback = needsInvalidFallback || cacheIsStale;

    useEffect(() => {
        if (alreadyJoined) router.replace(`/workspace/${cachedWorkspaceId}`);
    }, [alreadyJoined, cachedWorkspaceId, router]);

    useEffect(() => {
        if (!needsFallback || isWorkspacesPending) return;
        if (cacheIsStale) inviteLinks.remove(token);
        router.replace(fallbackWorkspaceId ? `/workspace/${fallbackWorkspaceId}` : '/workspace/new');
    }, [needsFallback, cacheIsStale, isWorkspacesPending, fallbackWorkspaceId, token, router]);

    const claimInvite = async () => {
        const { error: claimError } = await supabase().rpc('claim_workspace_invite', {
            p_token: token,
        });
        if (claimError) throw claimError;
        inviteLinks.set(token, invite.workspace_id);
        router.replace('/');
    };

    const handleJoin = async () => {
        setError(null);
        setIsPending(true);
        try {
            await claimInvite();
        } catch (err) {
            setIsPending(false);
            setError(err.message);
        }
    };

    if (isInvitePending || isAuthLoading) {
        return <Loading />;
    }

    // Either still confirming the cached membership is real, or it just was
    // — redirecting above, nothing to confirm either way.
    if (isVerifyingCachedMembership || alreadyJoined) {
        return <Loading label='Entrando al espacio…' />;
    }

    // Returning visitor, session expired — a plain login (no identity/
    // registration step, they already have a profile). No direct redirect
    // here on purpose: once `user` populates, this component re-renders and
    // falls through to the alreadyJoined/cacheIsStale logic above, so a
    // removed membership gets caught the same way whether or not the
    // session had to be re-established first.
    if (!user && cachedWorkspaceId) {
        return (
            <AuthShell>
                <EmailCodeCard
                    title='Bienvenido de vuelta'
                    description='Escribe tu correo para volver a entrar a tu espacio.'
                    emailSubmitLabel='Enviar código'
                    codeSubmitLabel='Entrar'
                    onVerified={async () => {}}
                />
            </AuthShell>
        );
    }

    if (needsFallback) {
        // fallbackWorkspaceId only means anything once workspaces has
        // loaded — the redirect effect itself waits for the same thing, so
        // treat "still loading" and "loaded, found one" as the same label.
        const knowsTheresNoFallback = !isWorkspacesPending && !fallbackWorkspaceId;
        return (
            <Loading label={knowsTheresNoFallback ? 'Preparando tu espacio…' : 'Buscando tu espacio…'} />
        );
    }

    if (!invite?.valid) {
        return <InvalidInviteCard />;
    }

    if (user) {
        return (
            <AuthShell>
                <Card
                    className='relative w-full max-w-sm gap-5 overflow-hidden rounded-2xl border-t-4 border-primary/40 shadow-lg shadow-primary/10'
                    data-block='JoinExistingUserCard'
                >
                    <CardHeader className='items-center gap-3 text-center'>
                        <span className='mx-auto flex size-12 items-center justify-center rounded-full bg-flourish/15 text-flourish [&_svg]:size-5'>
                            <UsersIcon weight='bold' />
                        </span>
                        <div>
                            <CardTitle className='text-pretty'>
                                Unirte a {invite.workspace_name}
                            </CardTitle>
                            <CardDescription className='mt-1'>
                                Vas a entrar con tu cuenta actual.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    {error && (
                        <CardContent className='text-center text-xs text-destructive'>
                            {error}
                        </CardContent>
                    )}
                    <CardFooter>
                        <Button
                            className='h-11 w-full sm:h-10'
                            onClick={handleJoin}
                            disabled={isPending}
                        >
                            {isPending && <Spinner data-icon='inline-start' />}
                            Unirse
                        </Button>
                    </CardFooter>
                </Card>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <EmailCodeCard
                withIdentity
                title={`Unirte a ${invite.workspace_name}`}
                description='Así aparecerás en el espacio. Cambia el nombre o tira los dados de nuevo.'
                emailSubmitLabel='Enviar código'
                codeSubmitLabel='Unirme'
                onVerified={async ({ user: verifiedUser }) => {
                    // claim_workspace_invite's insert has an FK to profiles —
                    // must wait for provisioning before claiming, can't rely
                    // on AuthProvider's own fire-and-forget call for that.
                    // If the claim fails (invite exhausted/expired in a
                    // race), the account is left with a profile and no
                    // workspace — same normal empty state as any other
                    // account with none, no auto-created fallback.
                    await ensureAccountProvisioned(supabase(), verifiedUser);
                    await claimInvite();
                }}
            />
        </AuthShell>
    );
}
