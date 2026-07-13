import { DynamicIcon } from '@/ui/dynamic-icon';
import { cn } from '@/helpers/utils';

// Simple icon-in-shape markers (pinia's CurrentLocationMarker pattern) —
// center-anchored, unlike MarkerPin's drop-pin stem, so the shape's visual
// center actually lands on the coordinate. Origin = blue circle, destination
// = green rounded-sm square, both carrying the location's own icon.
export const MoveRouteMarker = ({ icon, variant }) => (
    <div
        className={cn(
            'flex size-8 items-center justify-center border-2 border-background text-background shadow-md shadow-black/30 [&_svg]:size-4',
            variant === 'origin' && 'rounded-full bg-blue-500',
            variant === 'destination' && 'rounded-sm bg-green-500',
        )}
    >
        <DynamicIcon icon={icon} />
    </div>
);
