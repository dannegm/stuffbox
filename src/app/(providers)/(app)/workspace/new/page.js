'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HouseIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { createWorkspaceMutation } from '@/queries/workspaces';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

// A standalone counterpart to the "crear nuevo" item inside WorkspaceSwitcher
// (src/components/layout/workspace-switcher.jsx) — that one is a dialog
// reached from an existing workspace's sidebar, this is a landing spot for
// someone who doesn't have one to switch from yet (e.g. the invite page's
// fallback when a stale invite link has nowhere else useful to send them).
export default function NewWorkspacePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const [name, setName] = useState('');

    const { mutate, isPending } = useMutation(
        createWorkspaceMutation({
            onSuccess: workspace => {
                queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                router.replace(`/workspace/${workspace.id}`);
            },
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim() || !user) return;
        mutate({ name: name.trim(), userId: user.id });
    };

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='NewWorkspacePage'
        >
            <div
                className='relative overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='NewWorkspaceHero'
            >
                <div className='flex items-start gap-3'>
                    <span className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-card/80 text-primary shadow-xs ring-1 ring-foreground/10 [&_svg]:size-5'>
                        <HouseIcon />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-xl font-semibold tracking-tight'>
                            Crear espacio
                        </h1>
                        <p className='text-sm text-muted-foreground'>
                            Un espacio agrupa tus casas y todo lo que guardas en ellas.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='workspace-name'>Nombre</FieldLabel>
                        <Input
                            id='workspace-name'
                            autoFocus
                            required
                            value={name}
                            onChange={event => setName(event.target.value)}
                            placeholder='Ej. Casa de mis papás'
                        />
                    </Field>
                </FieldGroup>

                <Button type='submit' disabled={isPending || !name.trim()} className='w-full'>
                    {isPending && <Spinner data-icon='inline-start' />}
                    Crear espacio
                </Button>
            </form>
        </div>
    );
}
