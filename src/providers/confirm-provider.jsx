'use client';

import { createContext, useCallback, useRef, useState } from 'react';
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

export const ConfirmContext = createContext(null);

// Imperative confirm(options): Promise<boolean> backed by a single
// AlertDialog instance mounted once at the root — call sites just
// `await confirm({...})` instead of each screen owning its own dialog
// open-state boilerplate for what's always the same "sure?" shape
// (destructive delete confirmations, drag/transfer guardrails). Passing
// `cancelLabel: null` drops the Cancel button, so the same plumbing also
// covers plain acknowledge-only messages (the former `window.alert` spots).
export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState(null);
    const $resolve = useRef(null);

    const confirm = useCallback(
        ({
            title = '¿Estás seguro?',
            description,
            confirmLabel = 'Confirmar',
            cancelLabel = 'Cancelar',
            variant,
        } = {}) =>
            new Promise(resolve => {
                $resolve.current = resolve;
                setState({ title, description, confirmLabel, cancelLabel, variant });
            }),
        [],
    );

    const settle = result => {
        setState(null);
        $resolve.current?.(result);
        $resolve.current = null;
    };

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
                    <AlertDialogFooter>
                        {state?.cancelLabel && (
                            <AlertDialogCancel onClick={() => settle(false)}>
                                {state.cancelLabel}
                            </AlertDialogCancel>
                        )}
                        <AlertDialogAction variant={state?.variant} onClick={() => settle(true)}>
                            {state?.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
};
