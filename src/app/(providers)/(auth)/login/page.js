'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmailCodeCard } from '@/components/auth/email-code-card';

export default function LoginPage() {
    const router = useRouter();

    return (
        <div
            className='flex flex-1 flex-col items-center justify-center gap-4 p-4'
            data-block='LoginPage'
        >
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
    );
}
