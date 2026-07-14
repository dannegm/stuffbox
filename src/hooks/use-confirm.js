'use client';

import { useContext } from 'react';
import { ConfirmContext } from '@/providers/confirm-provider';

// confirm({ title, description, confirmLabel, cancelLabel, variant }) => Promise<boolean>.
// Omit `cancelLabel` (pass null) for an acknowledge-only message dialog —
// see ConfirmProvider for the full shape.
export const useConfirm = () => useContext(ConfirmContext);
