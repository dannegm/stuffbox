'use client';

import { use, useState } from 'react';
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
                'pointer-events-none absolute top-1/3 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:size-[36rem]',
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

export default function InvitePage({ params }) {
    const { token } = use(params);
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState(null);

    const { data: invite, isPending: isInvitePending } = useQuery(inviteQuery(token));

    const claimInvite = async () => {
        const { error: claimError } = await supabase().rpc('claim_workspace_invite', {
            p_token: token,
        });
        if (claimError) throw claimError;
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
        return (
            <AuthShell>
                <div className='flex flex-col items-center gap-3 text-muted-foreground'>
                    <Spinner className='size-6' />
                    <p className='text-xs'>Cargando invitación…</p>
                </div>
            </AuthShell>
        );
    }

    if (!invite?.valid) {
        return (
            <AuthShell accent='destructive'>
                <Card
                    className='relative w-full max-w-sm gap-5 overflow-hidden rounded-2xl border-t-4 border-dashed border-destructive/40 shadow-lg shadow-destructive/10'
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
    }

    if (user) {
        return (
            <AuthShell>
                <Card
                    className='relative w-full max-w-sm gap-5 overflow-hidden rounded-2xl border-t-4 border-dashed border-primary/40 shadow-lg shadow-primary/10'
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
                    await ensureAccountProvisioned(supabase(), verifiedUser);
                    await claimInvite();
                }}
            />
        </AuthShell>
    );
}
