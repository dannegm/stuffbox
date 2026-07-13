'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery, updateProfileMutation } from '@/queries/profiles';
import { generateName } from '@/helpers/identity';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { IdentityTag } from '@/components/auth/identity-tag';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Separator } from '@/ui/separator';

const Loading = () => (
    <div className='flex flex-1 items-center justify-center' data-block='ProfileLoading'>
        <Spinner className='size-6' />
    </div>
);

export default function ProfilePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();

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
            <h1 className='font-heading text-lg font-medium'>Tu perfil</h1>

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

            <Separator />

            <div className='flex flex-col gap-2'>
                <h2 className='text-sm font-medium text-muted-foreground'>Preferencias</h2>
                <ThemeToggle />
            </div>
        </div>
    );
}
