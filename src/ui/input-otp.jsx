import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';

import { cn } from '@/helpers/utils';

function InputOTP({ className, containerClassName, ...props }) {
    return (
        <OTPInput
            data-slot='input-otp'
            containerClassName={cn(
                'cn-input-otp flex items-center has-disabled:opacity-50',
                containerClassName,
            )}
            spellCheck={false}
            className={cn('disabled:cursor-not-allowed', className)}
            {...props}
        />
    );
}

function InputOTPGroup({ className, ...props }) {
    return (
        <div
            data-slot='input-otp-group'
            className={cn('flex items-center gap-3', className)}
            {...props}
        />
    );
}

function InputOTPSlot({ index, className, ...props }) {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

    return (
        <div
            data-slot='input-otp-slot'
            data-active={isActive}
            className={cn('flex w-7 flex-col items-center gap-2', className)}
            {...props}
        >
            <span className='relative flex h-7 items-center justify-center font-mono text-2xl font-semibold'>
                {char}
                {hasFakeCaret && (
                    <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                        <span className='h-6 w-px animate-caret-blink bg-foreground duration-1000' />
                    </span>
                )}
            </span>
            <span
                className={cn(
                    'h-0.5 w-full rounded-full bg-border transition-colors',
                    isActive && 'h-1 bg-primary',
                )}
            />
        </div>
    );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
