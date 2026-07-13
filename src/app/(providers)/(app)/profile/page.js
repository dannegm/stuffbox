'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { SignOutIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery, updateProfileMutation } from '@/queries/profiles';
import { generateName } from '@/helpers/identity';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { IdentityTag } from '@/components/auth/identity-tag';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Skeleton } from '@/ui/skeleton';

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4'
        data-block='ProfileLoading'
    >
        <Skeleton className='h-7 w-32 rounded' />
        <Skeleton className='h-28 w-full rounded-lg' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-9 w-full rounded-md' />
            <Skeleton className='h-9 w-24 rounded-md' />
        </div>
        <Skeleton className='h-28 w-full rounded-xl' />
    </div>
);

// A plain labeled card — the recurring shape for every section below the
// identity tag (preferences, session) so they read as one grouped page
// instead of loose stacked blocks.
const SectionCard = ({ label, children, className }) => (
    <div
        className='flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/5'
        data-block='ProfileSectionCard'
    >
        <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            {label}
        </h2>
        <div className={className}>{children}</div>
    </div>
);

export default function ProfilePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading, signOut } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !user) router.replace('/login');
    }, [isAuthLoading, user, router]);

    const { data: profile, isPending } = useQuery(profileQuery(user?.id, { enabled: !!user }));

    const [name, setName] = useState('');
    const [gender, setGender] = useState('male');
    const [avatarSeed, setAvatarSeed] = useState('');
    const [color, setColor] = useState('#6366f1');

    useEffect(() => {
        if (!profile) return;
        setName(profile.name);
        setGender(profile.gender);
        setAvatarSeed(profile.avatar_seed);
        setColor(profile.color);
    }, [profile]);

    const { mutate, isPending: isSaving } = useMutation(
        updateProfileMutation({
            onSuccess: updated => queryClient.setQueryData(['profile', user?.id], updated),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({ id: user?.id, name: name.trim(), gender, avatarSeed, color });
    };

    if (isAuthLoading || !user || isPending || !profile) {
        return <Loading />;
    }

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4'
            data-block='ProfilePage'
        >
            <div className='min-w-0'>
                <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    Cuenta
                </p>
                <h1 className='truncate font-heading text-2xl font-semibold tracking-tight'>
                    Tu perfil
                </h1>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <IdentityTag
                    identity={{ name, color, gender, avatarSeed }}
                    onNameChange={setName}
                    onColorChange={setColor}
                    onGenderChange={setGender}
                    onRegenerateName={() => setName(generateName())}
                    onRegenerateAvatar={() => setAvatarSeed(nanoid(10))}
                />

                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='profile-email'>Correo</FieldLabel>
                        <Input id='profile-email' value={profile.email} disabled />
                    </Field>
                </FieldGroup>

                <Button type='submit' disabled={isSaving || !name.trim()} className='self-start'>
                    {isSaving && <Spinner data-icon='inline-start' />}
                    Guardar
                </Button>
            </form>

            <SectionCard label='Preferencias'>
                <ThemeToggle />
            </SectionCard>

            <SectionCard
                label='Sesión'
                className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between'
            >
                <p className='text-sm text-muted-foreground'>
                    Cierra tu sesión en este dispositivo.
                </p>
                <Button variant='outline' onClick={() => signOut()} className='w-full sm:w-auto'>
                    <SignOutIcon data-icon='inline-start' />
                    Cerrar sesión
                </Button>
            </SectionCard>
        </div>
    );
}
