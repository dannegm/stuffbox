import { cn } from '@/helpers/utils';
import { SpinnerIcon } from '@phosphor-icons/react/ssr';

function Spinner({ className, ...props }) {
    return (
        <SpinnerIcon
            weight='bold'
            data-slot='spinner'
            role='status'
            aria-label='Loading'
            className={cn('size-4 animate-spin', className)}
            {...props}
        />
    );
}

export { Spinner };
