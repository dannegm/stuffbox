// stuffbox-plan.md §4: moves.status is app-defined, not DB-constrained —
// this is the one place the allowed values are decided.
export const MOVE_STATUSES = [
    { value: 'planning', label: 'Planeando' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'done', label: 'Completada' },
];

export const getMoveStatusLabel = status =>
    MOVE_STATUSES.find(option => option.value === status)?.label ?? status;

const today = () => new Date().toISOString().slice(0, 10);

// Shared with the moves list page, the sidebar's MovesNavItem, and
// PackIntoMoveDialog — one status color language everywhere a move shows
// up as a compact row. A function rather than a status->color map because
// the dot depends on more than `status`: planning splits on whether
// anything's packed yet, and in_transit splits on whether it's already
// past estimated_completion_at.
export const getMoveStatusDot = move => {
    if (move.status === 'done') return 'bg-emerald-500';
    if (move.status === 'in_transit') {
        const isDelayed = !!move.estimated_completion_at && move.estimated_completion_at < today();
        return isDelayed ? 'bg-red-500' : 'bg-blue-500';
    }
    return move.has_items ? 'bg-yellow-500' : 'bg-muted-foreground';
};
