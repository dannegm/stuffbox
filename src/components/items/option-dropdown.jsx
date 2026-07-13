'use client';

import { SelectSearch } from '@/ui/select-search';
import { Field, FieldLabel } from '@/ui/field';
import { cn } from '@/helpers/utils';

const UNSET = 'Sin especificar';

// Shared by item/new and item/[id] (edit) — condition/orientation are
// workspace-scoped free strings from option_lists, plus a synthetic "unset"
// choice that maps back to null/empty.
export const OptionDropdown = ({ label, value, onChange, options = [] }) => (
    <Field>
        <FieldLabel>{label}</FieldLabel>
        <SelectSearch
            options={[{ value: UNSET }, ...options]}
            value={value || UNSET}
            onChange={next => onChange(next === UNSET ? '' : next)}
            getKey={option => option.value}
            getLabel={option => option.value}
            searchPlaceholder={`Buscar ${label.toLowerCase()}`}
            renderOption={option => (
                <span
                    className={cn(
                        'flex items-center gap-2',
                        option.value === UNSET && 'text-muted-foreground',
                    )}
                >
                    <span
                        aria-hidden
                        className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            option.value === UNSET ? 'bg-muted-foreground/40' : 'bg-primary/60',
                        )}
                    />
                    {option.value}
                </span>
            )}
        />
    </Field>
);
