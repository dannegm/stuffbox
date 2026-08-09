// A record's own active_move_id wins; otherwise it inherits from the
// nearest packed ancestor (boxed items/locations don't get their own
// active_move_id — only the box that was actually packed does; anything
// nested inside it, any depth, is "packed" only by walking up the chain).
// `ancestors` is the root-first array from locationAncestorsQuery.
export const getInheritedPackedMoveId = (ownMoveId, ancestors = []) =>
    ownMoveId ?? ancestors.find(ancestor => ancestor.active_move_id)?.active_move_id ?? null;
