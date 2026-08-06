'use client';

import { useState } from 'react';
import {
    CurrencyDollarIcon,
    WalletIcon,
    CalendarBlankIcon,
    PackageIcon,
    LeafIcon,
    PencilSimpleIcon,
} from '@phosphor-icons/react/ssr';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import { MoveCostDialog } from '@/components/moves/move-cost-dialog';
import { MoveDatesEditDialog } from '@/components/moves/move-dates-edit-dialog';
import { cn } from '@/helpers/utils';

// Postgres `date` columns come back as plain "YYYY-MM-DD" strings — parsing
// those with `new Date()` anchors to UTC midnight, so formatting/diffing
// must stay in UTC too, or a negative UTC-offset timezone (e.g. Mexico City)
// renders/compares one day off.
const formatDate = dateStr => new Date(dateStr).toLocaleDateString('es-MX', { timeZone: 'UTC' });
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const formatMoney = value => `$${Number(value).toLocaleString('es-MX')}`;
const pluralDays = count => `${count} día${count === 1 ? '' : 's'}`;

const getMoveProgress = move => {
    // started_at (and therefore completed_at, always >= it) can be set in
    // the future — a planned move not underway yet — in which case the
    // day-count math goes negative. Read as "not happening yet" rather than
    // a bogus negative duration.
    if (!move.started_at) return { text: 'Sin iniciar' };
    if (move.started_at > today()) return { text: 'Próximamente' };

    if (move.status === 'done') {
        const total = move.completed_at ? daysBetween(move.started_at, move.completed_at) : null;
        if (total != null && total < 0) return { text: 'Próximamente' };
        return { text: total ? `Completada en ${pluralDays(total)}` : 'Completada' };
    }

    if (move.estimated_completion_at && today() > move.estimated_completion_at) {
        const delay = daysBetween(move.estimated_completion_at, today());
        return { text: `${pluralDays(delay)} de retraso`, isLate: true };
    }

    return { text: `${pluralDays(daysBetween(move.started_at, today()))} en tránsito` };
};

const SummaryBox = ({ icon: Icon, label, iconClassName, action, children, className }) => (
    <div
        className={cn(
            'flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5',
            className,
        )}
        data-block='MoveSummaryBox'
    >
        <div className='flex items-center gap-2'>
            <span
                className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5',
                    iconClassName,
                )}
            >
                <Icon />
            </span>
            <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>{label}</span>
            {action}
        </div>
        {children}
    </div>
);

export const MoveSummary = ({ move, packed, totalValue, isTotalValuePending }) => {
    const [costDialogOpen, setCostDialogOpen] = useState(false);
    const [datesDialogOpen, setDatesDialogOpen] = useState(false);
    const progress = getMoveProgress(move);

    return (
        <div className='grid grid-cols-2 gap-2' data-block='MoveSummary'>
            <SummaryBox
                icon={CurrencyDollarIcon}
                label='Valor de la mudanza'
                iconClassName='bg-primary/10 text-primary'
            >
                {isTotalValuePending ? (
                    <Skeleton className='h-6 w-20' />
                ) : (
                    <span className='font-heading text-2xl font-semibold tabular-nums ml-8.5'>
                        {formatMoney(totalValue ?? 0)}
                    </span>
                )}
            </SummaryBox>

            <SummaryBox
                icon={WalletIcon}
                label='Costo de la mudanza'
                iconClassName='bg-flourish/15 text-flourish'
                action={
                    <Button
                        size='icon-sm'
                        variant='ghost'
                        className='size-6 -my-1 -mr-1'
                        onClick={() => setCostDialogOpen(true)}
                    >
                        <PencilSimpleIcon />
                    </Button>
                }
            >
                <span className='font-heading text-2xl font-semibold tabular-nums ml-8.5'>
                    {move.cost != null ? formatMoney(move.cost) : 'N/A'}
                </span>
            </SummaryBox>

            <SummaryBox
                icon={CalendarBlankIcon}
                label='Fechas'
                iconClassName='bg-primary/10 text-primary'
                action={
                    <Button
                        size='icon-sm'
                        variant='ghost'
                        className='size-6 -my-1 -mr-1'
                        onClick={() => setDatesDialogOpen(true)}
                    >
                        <PencilSimpleIcon />
                    </Button>
                }
            >
                <span
                    className={cn(
                        'font-heading text-base font-semibold tabular-nums',
                        progress.isLate && 'text-destructive',
                    )}
                >
                    {progress.text}
                </span>

                {move.started_at && (
                    <span className='truncate text-xs text-muted-foreground -mt-1'>
                        {formatDate(move.started_at)}
                        {move.status === 'done' && move.completed_at
                            ? ` – ${formatDate(move.completed_at)}`
                            : move.status !== 'done' && move.estimated_completion_at
                              ? ` · límite ${formatDate(move.estimated_completion_at)}`
                              : ''}
                    </span>
                )}
            </SummaryBox>

            <SummaryBox
                icon={PackageIcon}
                label='Empacado'
                iconClassName='bg-muted text-muted-foreground'
            >
                <div className='flex items-center gap-4'>
                    <Stat icon={PackageIcon} value={packed.locations.length} label='cajas' />
                    <Stat icon={LeafIcon} value={packed.items.length} label='muebles' />
                </div>
            </SummaryBox>

            <MoveCostDialog move={move} open={costDialogOpen} onOpenChange={setCostDialogOpen} />
            <MoveDatesEditDialog
                move={move}
                open={datesDialogOpen}
                onOpenChange={setDatesDialogOpen}
            />
        </div>
    );
};
