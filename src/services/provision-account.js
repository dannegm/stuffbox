import { nanoid } from 'nanoid'

const CONDITION_OPTIONS = [
  'New', 'Like new', 'Good', 'Used', 'Worn', 'Damaged',
  'Needs repair', 'Restored', 'Vintage', 'Out of service', 'To discard',
]

const ORIENTATION_OPTIONS = [
  'No restriction', 'This side up', 'Lay flat', 'Do not tilt', 'Do not stack',
]

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
    .maybeSingle()

  if (!profile) {
    await supabase.from('profiles').insert({
      uuid: user.id,
      name: user.user_metadata?.name ?? user.email.split('@')[0],
      email: user.email,
      gender: Math.random() < 0.5 ? 'male' : 'female',
      avatar_seed: user.id,
    })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership) return

  const workspaceId = nanoid(8)

  await supabase.from('workspaces').insert({
    id: workspaceId,
    name: 'My workspace',
    owner_id: user.id,
  })

  await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
  })

  await supabase.from('option_lists').insert([
    ...CONDITION_OPTIONS.map((value, index) => ({
      workspace_id: workspaceId, field: 'condition', value, sort_order: index + 1,
    })),
    ...ORIENTATION_OPTIONS.map((value, index) => ({
      workspace_id: workspaceId, field: 'orientation', value, sort_order: index + 1,
    })),
  ])
}
