const PENDING_IDENTITY_KEY = 'stuffbox:pending-identity';

// Stashed by the login/invite pages right before signInWithOtp(), so the
// pregenerated name/color/gender/avatar the user saw on the identity card
// becomes their actual profile — read here regardless of which caller wins
// the race between the page's own await and AuthProvider's automatic call.
export const setPendingIdentity = identity => {
    sessionStorage.setItem(PENDING_IDENTITY_KEY, JSON.stringify(identity));
};

const popPendingIdentity = () => {
    const raw = sessionStorage.getItem(PENDING_IDENTITY_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_IDENTITY_KEY);
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const CONDITION_OPTIONS = [
    'Nuevo',
    'Como nuevo',
    'Bueno',
    'Usado',
    'Desgastado',
    'Dañado',
    'Necesita reparación',
    'Restaurado',
    'Vintage',
    'Fuera de servicio',
    'Para desechar',
];

// Fixed directional enum, not free text like CONDITION_OPTIONS — drives the
// "this side up" arrow rotation on printed labels (label-document.jsx).
const ORIENTATION_OPTIONS = ['NONE', 'UP', 'DOWN', 'LEFT', 'RIGHT'];

// Call on every authenticated session (e.g. AuthProvider on SIGNED_IN), not
// only right after signUp() — if email confirmation is on, there's no
// session (and no auth.uid() for RLS) until the user actually confirms and
// logs in. Idempotent and resumable: each step only runs if the previous one
// didn't already happen, so a dropped connection mid-provisioning just
// finishes on the next call instead of leaving a half-created account.
//
// Deliberately does NOT create a workspace — workspaces only ever come from
// an explicit user action (/workspace/new, or claim_workspace_invite via an
// invite link), never auto-created on signup/login. A user with a profile
// and zero workspaces is a normal, expected state (see the Home page's empty
// state, which prompts them to create one).
export const ensureAccountProvisioned = async (supabase, user) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('uuid')
        .eq('uuid', user.id)
        .maybeSingle();

    if (profile) return;

    const pending = popPendingIdentity();
    await supabase.from('profiles').insert({
        uuid: user.id,
        name: pending?.name ?? user.email.split('@')[0],
        email: user.email,
        gender: pending?.gender ?? (Math.random() < 0.5 ? 'male' : 'female'),
        avatar_seed: pending?.avatarSeed ?? user.id,
        ...(pending?.color ? { color: pending.color } : {}),
    });
};

// Shared by createWorkspaceMutation (src/queries/workspaces.js, the "crear
// nuevo" flow) and /workspace/new — every workspace, wherever it's created
// from, gets the same seeded condition/orientation option lists.
export const seedWorkspaceOptionLists = async (supabase, workspaceId) => {
    await supabase.from('option_lists').insert([
        ...CONDITION_OPTIONS.map((value, index) => ({
            workspace_id: workspaceId,
            field: 'condition',
            value,
            sort_order: index + 1,
        })),
        ...ORIENTATION_OPTIONS.map((value, index) => ({
            workspace_id: workspaceId,
            field: 'orientation',
            value,
            sort_order: index + 1,
        })),
    ]);
};
