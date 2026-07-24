// Deterministic per-seed pick — Math.random() would re-roll on every mount,
// which matters wherever the same entity can remount with a fresh component
// instance (e.g. DeckCards keys its cards by stack position, not identity).
export const pickBySeed = (seed, options) => {
    const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
    return options[hash % options.length];
};
