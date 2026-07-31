// stuffbox-plan.md §4: moves.status is app-defined, not DB-constrained —
// this is the one place the allowed values are decided.
export const MOVE_STATUSES = [
    { value: 'planning', label: 'Planeando' },
    { value: 'in_transit', label: 'En tránsito' },
    { value: 'done', label: 'Completada' },
];

export const getMoveStatusLabel = status =>
    MOVE_STATUSES.find(option => option.value === status)?.label ?? status;

// Shared with the moves list page and the sidebar's MovesNavItem — one
// status color language everywhere a move shows up as a compact row.
export const MOVE_STATUS_DOT = {
    planning: 'bg-muted-foreground',
    in_transit: 'bg-flourish',
    done: 'bg-emerald-500',
};
