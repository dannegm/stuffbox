'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/ssr';
import { nanoid } from 'nanoid';
import { useAuth } from '@/providers/auth-provider';
import { profileQuery, updateProfileMutation } from '@/queries/profiles';
import { getAvatarUrl } from '@/helpers/avatar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { ColorPicker } from '@/ui/color-picker';
import { SelectSearch } from '@/ui/select-search';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { Separator } from '@/ui/separator';

const GENDER_OPTIONS = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
];

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
            onSuccess: updated => queryClient.setQueryData(['profile', user.id], updated),
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({ id: user.id, name: name.trim(), gender, avatarSeed, color });
    };

    if (isAuthLoading || !user || isPending || !profile) {
        return <Loading />;
    }

    const previewAvatarUrl = getAvatarUrl(avatarSeed, gender);

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-4'
            data-block='ProfilePage'
        >
            <h1 className='font-heading text-lg font-medium'>Tu perfil</h1>

            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <FieldGroup>
                    <Field>
                        <FieldLabel>Avatar</FieldLabel>
                        <div className='flex items-center gap-3'>
                            <Avatar
                                className='size-16 bg-(--profile-color)'
                                style={{ '--profile-color': color }}
                            >
                                <AvatarImage src={previewAvatarUrl} alt={name} />
                                <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className='flex flex-col gap-2'>
                                <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setAvatarSeed(nanoid(10))}
                                >
                                    <ArrowsClockwiseIcon data-icon='inline-start' />
                                    Regenerar
                                </Button>
                                <ColorPicker value={color} onChange={setColor}>
                                    <button
                                        type='button'
                                        aria-label='Elegir color'
                                        className='size-9 shrink-0 rounded-md border border-input bg-(--profile-color)'
                                        style={{ '--profile-color': color }}
                                    />
                                </ColorPicker>
                            </div>
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel>Género del avatar</FieldLabel>
                        <SelectSearch
                            options={GENDER_OPTIONS}
                            value={gender}
                            onChange={setGender}
                            getKey={option => option.value}
                            getLabel={option => option.label}
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor='profile-name'>Nombre</FieldLabel>
                        <Input
                            id='profile-name'
                            value={name}
                            onChange={event => setName(event.target.value)}
                        />
                    </Field>

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
