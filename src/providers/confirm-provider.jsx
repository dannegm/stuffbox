'use client';

import { createContext, useCallback, useRef, useState } from 'react';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { CheckIcon, CopyIcon } from '@phosphor-icons/react/ssr';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/ui/alert-dialog';
import { Field, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';

export const ConfirmContext = createContext(null);

// Imperative confirm(options): Promise<boolean> backed by a single
// AlertDialog instance mounted once at the root — call sites just
// `await confirm({...})` instead of each screen owning its own dialog
// open-state boilerplate for what's always the same "sure?" shape
// (destructive delete confirmations, drag/transfer guardrails). Passing
// `cancelLabel: null` drops the Cancel button, so the same plumbing also
// covers plain acknowledge-only messages (the former `window.alert` spots).
//
// `confirmText` (optional) turns this into a type-to-confirm dialog — the
// Confirm button stays disabled until the typed value matches (trimmed,
// case-insensitive), the standard guard for destructive deletes across the
// app: the entity's own name where one exists, or the word "eliminar" where
// it doesn't (e.g. leaving a workspace).
export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState(null);
    const [typedValue, setTypedValue] = useState('');
    const [copied, setCopied] = useState(false);
    const [, copyToClipboard] = useCopyToClipboard();
    const $resolve = useRef(null);

    const confirm = useCallback(
        ({
            title = '¿Estás seguro?',
            description,
            confirmLabel = 'Confirmar',
            cancelLabel = 'Cancelar',
            variant,
            confirmText,
        } = {}) =>
            new Promise(resolve => {
                $resolve.current = resolve;
                setTypedValue('');
                setCopied(false);
                setState({ title, description, confirmLabel, cancelLabel, variant, confirmText });
            }),
        [],
    );

    const settle = result => {
        setState(null);
        setTypedValue('');
        setCopied(false);
        $resolve.current?.(result);
        $resolve.current = null;
    };

    const handleCopyConfirmText = () => {
        copyToClipboard(state.confirmText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const requiresTyping = !!state?.confirmText;
    const isConfirmDisabled =
        requiresTyping && typedValue.trim().toLowerCase() !== state.confirmText.trim().toLowerCase();

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AlertDialog open={!!state} onOpenChange={open => !open && settle(false)}>
                <AlertDialogContent data-block='ConfirmDialog'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{state?.title}</AlertDialogTitle>
                        {state?.description && (
                            <AlertDialogDescription>{state.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    {requiresTyping && (
                        <Field>
                            {/* `block` overrides FieldLabel's own `flex w-fit`, which
                                otherwise splits this sentence into separate flex
                                items (with gaps between them) instead of letting it
                                wrap as normal inline text when the name is long. */}
                            <FieldLabel htmlFor='confirm-type-to-confirm' className='block w-full'>
                                Escribe{' '}
                                {/* A `span`, not a `button` — a button is an atomic
                                    inline-block box that can't break internally, so
                                    a long name would overflow instead of wrapping
                                    like the rest of this sentence does. */}
                                <span
                                    role='button'
                                    tabIndex={0}
                                    onClick={handleCopyConfirmText}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleCopyConfirmText();
                                        }
                                    }}
                                    className='cursor-pointer font-semibold underline decoration-dotted underline-offset-2 hover:text-primary'
                                >
                                    {state.confirmText}
                                    {copied ? (
                                        <CheckIcon className='ml-1 inline size-3.5 align-middle text-primary' />
                                    ) : (
                                        <CopyIcon className='ml-1 inline size-3.5 align-middle' />
                                    )}
                                </span>{' '}
                                para confirmar
                            </FieldLabel>
                            <Input
                                id='confirm-type-to-confirm'
                                autoFocus
                                autoComplete='off'
                                value={typedValue}
                                onChange={event => setTypedValue(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' && !isConfirmDisabled) settle(true);
                                }}
                            />
                        </Field>
                    )}
                    <AlertDialogFooter>
                        {state?.cancelLabel && (
                            <AlertDialogCancel onClick={() => settle(false)}>
                                {state.cancelLabel}
                            </AlertDialogCancel>
                        )}
                        <AlertDialogAction
                            variant={state?.variant}
                            disabled={isConfirmDisabled}
                            onClick={() => settle(true)}
                        >
                            {state?.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
};
