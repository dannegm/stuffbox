const STORAGE_KEY = 'stuffbox:invite-links';

const getAll = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const setAll = all => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
};

// Remembers which workspace a given invite token led to, so revisiting the
// same /invite/[token] link later still works as a direct shortcut into that
// workspace even after the invite row itself expires, gets exhausted, or is
// deleted from the DB — the token becomes a bookmark, not a fresh grant.
export const inviteLinks = {
    get: token => getAll()[token] ?? null,
    set: (token, workspaceId) => {
        const all = getAll();
        all[token] = workspaceId;
        setAll(all);
    },
    // Called once the invite page proves a cached entry no longer reflects
    // real membership (e.g. an owner removed this person from that
    // workspace) — without this, the shortcut would keep pointing at a
    // workspace RLS no longer lets them read.
    remove: token => {
        const all = getAll();
        delete all[token];
        setAll(all);
    },
};
