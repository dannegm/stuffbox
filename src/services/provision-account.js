import { nanoid } from 'nanoid';

const PENDING_IDENTITY_KEY = 'stuffbox:pending-identity';
const PENDING_INVITE_TOKEN_KEY = 'stuffbox:pending-invite-token';

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

// Stashed by /invite/[token] on mount, before the OTP verifies, so both the
// page's own awaited ensureAccountProvisioned() call AND AuthProvider's
// fire-and-forget one (racing off the same SIGNED_IN event) know a workspace
// join is about to happen via claim_workspace_invite and skip auto-creating
// a throwaway "Mi espacio" — whichever of the two runs first, peeking (not
// popping) means the other still sees it. The invite page itself clears it
// once the claim resolves, success or failure.
export const setPendingInviteToken = token => {
    sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
};

export const clearPendingInviteToken = () => {
    sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
};

const hasPendingInviteToken = () => !!sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY);

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
export const ensureAccountProvisioned = async (supabase, user) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('uuid')
        .eq('uuid', user.id)
        .maybeSingle();

    if (!profile) {
        const pending = popPendingIdentity();
        await supabase.from('profiles').insert({
            uuid: user.id,
            name: pending?.name ?? user.email.split('@')[0],
            email: user.email,
            gender: pending?.gender ?? (Math.random() < 0.5 ? 'male' : 'female'),
            avatar_seed: pending?.avatarSeed ?? user.id,
            ...(pending?.color ? { color: pending.color } : {}),
        });
    }

    const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

    if (membership) return;

    // A workspace join via invite token is in flight for this session — let
    // claim_workspace_invite() supply the membership instead of creating a
    // throwaway default workspace here. If the claim ends up failing, the
    // invite page clears the flag and calls this again to fall back to one.
    if (hasPendingInviteToken()) return;

    const workspaceId = nanoid(8);

    await supabase.from('workspaces').insert({
        id: workspaceId,
        name: 'Mi espacio',
        owner_id: user.id,
    });

    await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
    });

    await seedWorkspaceOptionLists(supabase, workspaceId);
};

// Shared by the auto-provisioned first workspace above and by
// createWorkspaceMutation (src/queries/workspaces.js) when the user creates
// an additional one from the sidebar switcher.
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
