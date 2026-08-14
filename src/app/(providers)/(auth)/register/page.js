'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePageTitle } from '@/hooks/use-page-title';
import { EmailCodeCard } from '@/components/auth/email-code-card';

export default function RegisterPage() {
    const router = useRouter();
    usePageTitle('Crear cuenta');

    return (
        <div
            className='relative flex min-h-svh flex-1 flex-col items-center justify-center gap-8 overflow-hidden bg-hero-mesh p-4 sm:p-6'
            data-block='RegisterPage'
        >
            <div
                aria-hidden
                className='pointer-events-none absolute top-1/3 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flourish/10 blur-3xl sm:size-[36rem]'
            />

            <div className='relative flex flex-col items-center gap-1.5 text-center'>
                <h1 className='font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl'>
                    Stuffbox
                </h1>
                <p className='max-w-2xs text-sm text-muted-foreground sm:max-w-xs'>
                    Un lugar para cada cosa. Empecemos por ti.
                </p>
            </div>

            <div className='relative flex w-full max-w-sm flex-col items-center gap-4'>
                <EmailCodeCard
                    withIdentity
                    title='Crea tu cuenta'
                    description='Así aparecerás en Stuffbox. Cambia el nombre o tira los dados de nuevo.'
                    emailSubmitLabel='Enviar código'
                    codeSubmitLabel='Crear cuenta'
                    onVerified={async () => {
                        router.replace('/');
                    }}
                />
                <p className='text-xs text-muted-foreground'>
                    ¿Ya tienes cuenta?{' '}
                    <Link
                        href='/login'
                        className='font-medium text-foreground underline underline-offset-4'
                    >
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
