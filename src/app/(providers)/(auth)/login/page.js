'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmailCodeCard } from '@/components/auth/email-code-card';

export default function LoginPage() {
    const router = useRouter();

    return (
        <div
            className='relative flex min-h-svh flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-hero-mesh p-4 sm:p-6'
            data-block='LoginPage'
        >
            <div
                aria-hidden
                className='pointer-events-none absolute top-1/3 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl sm:size-[36rem]'
            />

            <div className='relative flex flex-col items-center gap-1.5 text-center'>
                <h1 className='font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                    Stuffbox
                </h1>
                <p className='max-w-2xs text-sm text-muted-foreground sm:max-w-xs'>
                    Tu inventario del hogar, siempre a la mano.
                </p>
            </div>

            <div className='relative flex w-full max-w-sm flex-col items-center gap-4'>
                <EmailCodeCard
                    title='Iniciar sesión'
                    description='Escribe tu correo y te enviaremos un código de acceso.'
                    emailSubmitLabel='Enviar código'
                    codeSubmitLabel='Entrar'
                    onVerified={async () => {
                        router.replace('/');
                    }}
                />
                <p className='text-xs text-muted-foreground'>
                    ¿Primera vez aquí?{' '}
                    <Link
                        href='/register'
                        className='font-medium text-foreground underline underline-offset-4'
                    >
                        Crea una cuenta
                    </Link>
                </p>
            </div>
        </div>
    );
}
