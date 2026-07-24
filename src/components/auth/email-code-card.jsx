'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/ui/card';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/ui/field';
import { Input } from '@/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/ui/input-otp';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { IdentityTag } from '@/components/auth/identity-tag';
import { useEditableIdentity } from '@/hooks/use-editable-identity';
import { setPendingIdentity } from '@/services/provision-account';
import { sendLoginCode, verifyLoginCode, getProfileIdentityByEmail } from '@/services/auth';

// Supabase's own default rate limit for resending an OTP email — matches
// the cooldown enforced server-side, not an arbitrary UI choice.
const RESEND_COOLDOWN_SECONDS = 60;

// Shared by /login, /register and /invite/[token] — all three are the same
// email → 6-digit code flow underneath. `withIdentity` is the only thing
// that changes shape: login is a returning person, nothing to show or ask;
// register/invite are a first "who are you" moment, so they get the tag.
export const EmailCodeCard = ({
    withIdentity = false,
    title,
    description,
    codeTitle = 'Revisa tu correo',
    emailSubmitLabel = 'Enviar código',
    codeSubmitLabel = 'Confirmar',
    onVerified,
}) => {
    const formId = useId();
    const {
        identity,
        setName,
        setColor,
        setGender,
        regenerateName,
        regenerateAvatar,
        setIdentity,
    } = useEditableIdentity();

    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const $latestEmail = useRef('');
    const [code, setCode] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown === 0) return;
        const interval = setInterval(() => {
            setResendCooldown(seconds => Math.max(0, seconds - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const sendCode = async () => {
        setError(null);
        setIsPending(true);

        if (withIdentity) setPendingIdentity(identity);
        const { error: sendError } = await sendLoginCode(email);

        setIsPending(false);
        if (sendError) {
            setError(sendError.message);
            return false;
        }
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        return true;
    };

    const handleSendCode = async event => {
        event.preventDefault();
        const sent = await sendCode();
        if (sent) setStep('code');
    };

    const handleResend = () => {
        sendCode();
    };

    // Only meaningful on the identity step (register/invite) — recognizes an
    // email that already has an account and swaps the freshly generated
    // placeholder for that account's real name/gender/avatar/color, purely
    // in the UI. Never writes anything back to the DB.
    const handleEmailBlur = async event => {
        if (!withIdentity) return;

        const typedEmail = event.target.value.trim();
        if (!typedEmail) return;

        try {
            const existing = await getProfileIdentityByEmail(typedEmail);
            if (existing && $latestEmail.current === typedEmail) {
                setIdentity(existing);
            }
        } catch {
            // Lookup failing just leaves the generated placeholder identity in place.
        }
    };

    const handleVerifyCode = async event => {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        const { data, error: verifyError } = await verifyLoginCode(email, code);
        if (verifyError) {
            setIsPending(false);
            setError(verifyError.message);
            return;
        }

        try {
            await onVerified(data);
        } catch (err) {
            setIsPending(false);
            setError(err.message);
        }
    };

    return (
        <Card
            className='relative w-full max-w-sm gap-5 overflow-hidden rounded-2xl border-t-4 border-primary/40 shadow-lg shadow-primary/10'
            data-block='EmailCodeCard'
        >
            <CardHeader className='gap-3'>
                {withIdentity && (
                    <IdentityTag
                        identity={identity}
                        onNameChange={setName}
                        onColorChange={setColor}
                        onGenderChange={setGender}
                        onRegenerateName={regenerateName}
                        onRegenerateAvatar={regenerateAvatar}
                    />
                )}
                <div>
                    <div className='mb-1.5 flex items-center gap-2' data-block='StepEyebrow'>
                        <span className='font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary uppercase'>
                            Paso {step === 'email' ? '1' : '2'} de 2
                        </span>
                        <span aria-hidden className='h-px flex-1 bg-border' />
                    </div>
                    <CardTitle className='text-base'>
                        {step === 'email' ? title : codeTitle}
                    </CardTitle>
                    <CardDescription className='mt-1 text-pretty'>
                        {step === 'email' ? description : `Escribe el código que llegó a ${email}.`}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {step === 'email' ? (
                    <form id={`${formId}-email`} onSubmit={handleSendCode}>
                        <FieldGroup>
                            <Field data-invalid={!!error}>
                                <FieldLabel htmlFor={`${formId}-email-input`}>Correo</FieldLabel>
                                <Input
                                    id={`${formId}-email-input`}
                                    type='email'
                                    required
                                    autoFocus
                                    autoComplete='email'
                                    placeholder='tu@correo.com'
                                    value={email}
                                    onChange={event => {
                                        setEmail(event.target.value);
                                        $latestEmail.current = event.target.value.trim();
                                    }}
                                    onBlur={handleEmailBlur}
                                    aria-invalid={!!error}
                                    className='h-11 sm:h-10'
                                />
                                <FieldError>{error}</FieldError>
                            </Field>
                        </FieldGroup>
                    </form>
                ) : (
                    <form id={`${formId}-code`} onSubmit={handleVerifyCode}>
                        <FieldGroup>
                            <Field data-invalid={!!error} className='gap-4'>
                                <FieldLabel
                                    htmlFor={`${formId}-code-input`}
                                    className='justify-center'
                                >
                                    Código
                                </FieldLabel>
                                <InputOTP
                                    id={`${formId}-code-input`}
                                    maxLength={6}
                                    value={code}
                                    onChange={setCode}
                                    aria-invalid={!!error}
                                    containerClassName='justify-center gap-5 sm:gap-7'
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                    </InputOTPGroup>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                                <FieldError className='text-center'>{error}</FieldError>
                                <div className='flex justify-center'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        disabled={resendCooldown > 0 || isPending}
                                        onClick={handleResend}
                                        className='text-muted-foreground'
                                    >
                                        {resendCooldown > 0
                                            ? `Reenviar código (${resendCooldown}s)`
                                            : 'Reenviar código'}
                                    </Button>
                                </div>
                            </Field>
                        </FieldGroup>
                    </form>
                )}
            </CardContent>
            <CardFooter className='flex flex-col gap-2'>
                <Button
                    type='submit'
                    form={step === 'email' ? `${formId}-email` : `${formId}-code`}
                    className='h-11 w-full sm:h-10'
                    disabled={isPending || (step === 'code' && code.length < 6)}
                >
                    {isPending && <Spinner data-icon='inline-start' />}
                    {step === 'email' ? emailSubmitLabel : codeSubmitLabel}
                </Button>
                {step === 'code' && (
                    <Button
                        type='button'
                        variant='ghost'
                        className='w-full'
                        onClick={() => setStep('email')}
                    >
                        Cambiar correo
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
