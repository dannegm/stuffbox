'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { EmailCodeCard } from '@/components/auth/email-code-card';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase';
import { ensureAccountProvisioned } from '@/services/provision-account';

const inviteQuery = token => ({
    queryKey: ['invite', token],
    queryFn: async () => {
        const { data, error } = await supabase().rpc('get_invite_by_token', { p_token: token });
        if (error) throw error;
        return data?.[0] ?? null;
    },
});

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
            <div className='flex flex-1 items-center justify-center p-4' data-block='InvitePage'>
                <Spinner className='size-6' />
            </div>
        );
    }

    if (!invite?.valid) {
        return (
            <div className='flex flex-1 items-center justify-center p-4' data-block='InvitePage'>
                <Card className='w-full max-w-sm'>
                    <CardHeader className='text-center'>
                        <CardTitle>Invitación no válida</CardTitle>
                        <CardDescription>
                            Este enlace venció o ya se usó. Pide uno nuevo a quien te invitó.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (user) {
        return (
            <div className='flex flex-1 items-center justify-center p-4' data-block='InvitePage'>
                <Card className='w-full max-w-sm'>
                    <CardHeader className='text-center'>
                        <CardTitle>Unirte a {invite.workspace_name}</CardTitle>
                        <CardDescription>Vas a entrar con tu cuenta actual.</CardDescription>
                    </CardHeader>
                    {error && (
                        <CardContent className='text-xs text-destructive'>{error}</CardContent>
                    )}
                    <CardFooter>
                        <Button className='w-full' onClick={handleJoin} disabled={isPending}>
                            {isPending && <Spinner data-icon='inline-start' />}
                            Unirse
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className='flex flex-1 items-center justify-center p-4' data-block='InvitePage'>
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
        </div>
    );
}
