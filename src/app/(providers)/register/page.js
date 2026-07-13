'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmailCodeCard } from '@/components/auth/email-code-card';

export default function RegisterPage() {
    const router = useRouter();

    return (
        <div
            className='flex flex-1 flex-col items-center justify-center gap-4 p-4'
            data-block='RegisterPage'
        >
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
    );
}
