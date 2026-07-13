'use client';

import { HeartIcon } from '@phosphor-icons/react/ssr';
import { cn } from '@/helpers/utils';

const SCALE = [1, 2, 3, 4, 5];

// 1-5 hearts for sentimental_value — clicking the already-selected score
// clears it back to null (nullable in the schema, no "0" state otherwise).
export const HeartRating = ({ value, onChange, className }) => (
    <div className={cn('flex items-center gap-1', className)} data-block='HeartRating'>
        {SCALE.map(score => (
            <button
                key={score}
                type='button'
                aria-label={`${score} de 5`}
                aria-pressed={value === score}
                onClick={() => onChange(value === score ? null : score)}
                className={cn(
                    'p-0.5 text-muted-foreground transition-colors hover:text-destructive [&_svg]:size-5',
                    value >= score && 'text-destructive',
                )}
            >
                <HeartIcon weight={value >= score ? 'fill' : 'regular'} />
            </button>
        ))}
    </div>
);
