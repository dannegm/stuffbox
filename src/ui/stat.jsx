import { cn } from '@/helpers/utils';

// A single "N label" reading used in page-hero headers (workspace, location,
// move) and admin dashboards — kept as one primitive since the same shape
// repeats across all of them with just icon/value/label swapped out.
export const Stat = ({ icon: Icon, value, label, className }) => (
    <div className={cn('flex items-center gap-2', className)} data-block='Stat'>
        {Icon && (
            <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4'>
                <Icon />
            </span>
        )}
        <div className='flex min-w-0 flex-col leading-tight'>
            <span className='font-heading text-base font-semibold tabular-nums -mb-1'>{value}</span>
            <span className='hidden sm:block truncate text-xs text-muted-foreground'>{label}</span>
        </div>
    </div>
);
