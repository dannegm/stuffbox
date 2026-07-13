# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is pre-scaffold: as of this writing it contains only `stuffbox-plan.md` (the full spec) and this file. `stuffbox-plan.md` is the source of truth — read it in full before any implementation work. Everything below is a condensed operating guide derived from it; when the two disagree, the plan wins and this file should be updated to match.

## What stuffbox is

A personal household inventory app (Spanish UI, English code) with move-planning features layered on top of a general-purpose location tree (houses, rooms, shelves, drawers, warehouses, boxes, holding items). A "move" is a temporary state on top of the tree, not the core model.

## Reference projects

These are sibling repos on the owner's machine used as style/architecture references — read from them when the plan says "like bins" or "pinia's pattern":
- `../bins` — closest reference: Vite+React SPA, Supabase + RLS, direct-from-client CRUD, admin area, settings, DiceBear avatars. Target for the admin look.
- `../pinia` — icon-picker (`{library,name}` jsonb), map patterns (mapcn/MapLibre), `/migrate` skill.
- `../aura` — providers, settings service, ntfy.
- `../endpoints` — old Bun/Express monorepo. **Not used for stuffbox** — documented escape hatch only if a Route Handler ever outgrows Vercel free tier.
- `../skills` — shared skill sources.

## Commands

Package manager is **pnpm**, Node 24. Standard Next.js scripts apply once scaffolded (`pnpm dev`, `pnpm build`, `pnpm lint`). No automated test suite by design — see Development process below.

## Development process (owner's standing rule)

One feature at a time → implement → **stop** → owner tests manually → confirm → next. **Never run `git add`/`commit`/`push`** — the owner handles all git operations. Keep CLAUDE.md/AGENTS.md/docs in sync as the plan evolves.

## Architecture — the shape

Effectively an SPA: Next.js (latest, App Router) is the bundler + host; **Vercel free tier is the constraint driving every choice**. Server Components are avoided as much as possible.

- **CRUD is direct client → Supabase, guarded by RLS.** No API layer, no Server Actions for CRUD.
- **Auth** via `@supabase/ssr`; session lives in cookies transparently. A ~15-line middleware refreshes expired tokens (Supabase's standard App-Router pattern). Login is plain `supabase.auth.signInWithPassword()` on the client.
- **Server-side code exists only to hide a secret** — everything else is client-side. Four Route Handlers total (see below); nothing else touches the server.
- **PDF and QR generation are 100% client-side** (`@react-pdf/renderer`, `qrcode`) — zero serverless cost for labels.
- **State:** TanStack Query for all server state (no RSC data loading). **Freshness, not realtime:** refetch on window focus / relevant interactions / after mutations, plus manual refresh buttons — no Yjs, no Supabase Realtime.
- **URL state:** nuqs (filters, sort, pagination, panel state).

### The `<ClientComponent>` wrapper (critical, read before touching `app/layout.js` or providers)

`'use client'` alone does not skip SSR — a client component still pre-renders on the server and hydrates, which is where hydration errors come from. `app/layout.js` is the **only** real Server Component (minimal `<html><body>{children}</body></html>`). Immediately inside it, a `'use client'` provider wrapper, mounted-gated (`useState`+`useEffect` gate returning `null` until mounted), holds **all** providers: `QueryProvider` → `NuqsAdapter` → `BusProvider` → `DeviceProvider` → `AuthProvider`. Everything below is client-only by inheritance. Accepted cost: the gated subtree isn't in initial HTML (skeleton until hydrate) — fine, since this is an inventory app behind login with no SEO surface.

## Stack

Plain JavaScript (JSX) — **no TypeScript, ever**; convert any `.tsx` registry block to `.jsx` on install. Tailwind v4 (CSS-based `@theme` config, no `tailwind.config.js`). shadcn/ui on **Base UI** (`@base-ui/react`), not Radix. Icons: Lucide (+lucide-lab) resolved via a `DynamicIcon` component from `icon` jsonb `{library, name}`. Maps: mapcn (`@mapcn/map`, MapLibre) + hosted MapTiler style; land routes via OpenRouteService, air routes via geodesic arc (`@turf/turf`). Storage: Cloudflare R2, direct-from-client upload via presigned URL. Avatars: DiceBear.

### Code conventions (shared across all Danne reference projects — follow exactly)
- JS only, no `.ts`/`.tsx`, no JSDoc types. `export const` for everything.
- `useRef` vars: `$` prefix, no `Ref` suffix. `async/await`, never `.then()`.
- kebab-case files/folders. Components PascalCase, hooks camelCase `use…`.
- Layout: `src/components/` (domain-subfoldered), `src/ui/` (flat primitives), `src/helpers/` (not `lib/`; `cn()` at `src/helpers/utils.js`), `src/hooks/`, `src/constants/`, `src/queries/`, `src/providers/`. Routes under `app/`.
- Event bus (`BusProvider`: `useEvents`/`useListener`/`useEmitter`) instead of prop drilling — this is how the select→picker→confirm flow (LocationPicker) communicates across the tree.
- `cn()` with objects for conditional classes — never ternaries, never template-literal class strings.
- Runtime values via CSS custom properties + Tailwind var syntax (`bg-(--x)` + `style={{ '--x': v }}`) — never `style={{ color }}`.
- Icons sized via `[&>svg]:size-X`, never the Lucide `size` prop. `size-X` over `w/h`. `rem` over `px`. Tailwind scale over arbitrary `[...]`. Every `shadow-*` needs an explicit color.
- Loading/empty/error as named early-return components (use `match()` from utils), not inline `{isLoading && …}`.
- Every component mobile-first: unprefixed = mobile, `sm:`/`lg:`/`xl:` layered up.
- Dark mode via shadcn `dark` variant + semantic tokens; single `color` per entity (no light/dark split), resolve contrast in UI.
- TanStack Query factory pattern (`myQuery = (opts) => ({ queryKey, queryFn, ...opts })`) co-located with mutations in `src/queries/*.js`. `mutationFn` calls Supabase directly, or a Route Handler only for R2/AI/email.

### Standing utilities to port from reference projects
`cache`, `settings` (localStorage, path-based, cross-tab via BroadcastChannel), `useSettings`, `ntfy`/`useNtfy` (optional), `BusProvider`, `DeviceProvider` (sets `data-browser/os/device`), `match()`/`cn()`/`delay()` in `utils.js`, lazy-singleton Supabase browser client factory — plus new: `AuthProvider` (session), the `<ClientComponent>` wrapper.

## Data model (schema `stuffbox` in Supabase)

One schema per project, unchanged from earlier planning. PKs are `nanoid(8)` text — short, URL/label-friendly, non-sequential; safe because everything sits behind auth + RLS, not id secrecy.

Tables: `profiles` (mirrors `auth.users`), `workspaces` (collab container, auto-created per user), `workspace_members` (no role column — owner vs. guest share permissions except member-removal), `workspace_invites` (link-based, no email), `locations` (**generic unbounded tree** — house/room/shelf/box are all nodes distinguished by free-text `type`; boxes can nest; multiple roots = multiple houses), `items` (required `location_id`, single `active_move_id` for loose items only — boxed items inherit their box's move state), `item_photos` (crop metadata only, never physically cropped), `tags` + `item_tags` (many-to-many), `moves` (route geometry never stored, computed live client-side), `option_lists` (one generic mechanism for per-workspace configurable lists — `condition`/`orientation`, not one table per field), `app_settings`/`workspace_settings`/`user_settings` (settings cascade: env < app < workspace < user < localStorage — cascade resolution across levels is explicitly **deferred**, not silently assumed), `movement_log` (written by a Postgres trigger AFTER UPDATE, not app logic).

Full field-level detail lives in `stuffbox-plan.md` §4 — consult it before writing migrations.

## RLS (adopted from `../bins/db.sql`)

Since CRUD is direct-from-client, **RLS is the actual authorization layer**, not decorative. Pattern to replicate on every `workspace_id` table:
- `stuffbox.is_workspace_member(workspace_id, auth.uid())` and `stuffbox.requesting_user_is_admin()` — both `security definer stable`, avoiding recursive RLS.
- Two permissive policies per table (Postgres ORs them): member access, and admin full access via `requesting_user_is_admin()`.
- `is_super_admin` gates both the admin RLS policy and admin UI visibility — never client-editable.
- No `anon` grants anywhere — zero public content.
- Invite claims use `UPDATE … WHERE uses_count < max_uses AND now() < expires_at RETURNING *` (atomic, no read-then-write race); the invite landing page only SELECTs (bot-safe), the "Unirse" button runs the claim.

Explicitly **not** ported from bins: the delete-`auth.users`-on-profile-delete trigger, `is_bot`/`ip_hash`/geo/user-agent columns and their cleanup crons, `anon` grants — bins solves problems stuffbox doesn't have (no anonymous users).

## Pack / unpack / transfer — one operation

These are all the same DB write: set `location_id` and/or `active_move_id` on a batch of item/box ids.
- **Transfer** = set `location_id`, leave `active_move_id`.
- **Pack** = set `active_move_id`; `location_id` untouched (box still "lives" at origin, just flagged).
- **Unpack** = set `location_id` to the destination + clear `active_move_id`.
- **Bulk** = same, with an array of ids.

A single FK means an item/box can't be in two moves at once by construction. Boxed items inherit their box's move state — to pack a boxed item into a *different* move, it must first leave the box (become loose).

## LocationPicker + bulk actions (the most important component)

Pack, unpack, transfer, and bulk are one UI shape matching the one DB operation above: multi-select of items/boxes, plus a navigable LocationPicker (breadcrumb + drill-down through the unbounded tree, "dejar aquí" at any level, recurses into boxes) reused for unpack destination, pack-into-box, and transfer target. Selection state and picker communicate via the **event bus**, not prop drilling — this is the reason `BusProvider` is in the stack.

## Route Handlers (the only server-side code)

Exactly four, each holding a secret that must not reach the client — everything else is client + direct Supabase:
```
POST /api/uploads/presign    # R2 secret → presigned PUT urls
POST /api/uploads/optimize   # R2 secret → list + delete unreferenced R2 objects (manual button, no cron)
POST /api/summary            # LLM key → generate/refresh a box's ai_summary
POST /api/labels/email       # Resend key → email the client-built label PDF
```
If any outgrows Vercel free limits, the documented escape hatch is a serverless worker outside Vercel (Cloudflare, or `../endpoints`) — not the main path.

Photo pipeline is entirely client-side before upload: rotate per EXIF into pixels then strip it, resize to a configurable max dimension, strip metadata, convert to JPEG — all in one canvas round-trip, before the presign call.

## Admin

`is_super_admin` on `profiles` gates an `AdminLayout` (nav tabs + live counts) that sees every workspace/user with full CRUD. It works with **no service key and no separate admin API** — the super-admin's normal client session already satisfies the `requesting_user_is_admin()` RLS policy on every table, so direct-from-client CRUD just works at admin scope too. Table views (`workspaces`, `users`) keep all filter/sort/page state in nuqs, per the bins pattern.

## Schema workflow

`db.sql` is the canonical, self-contained schema (fresh Supabase project → run it → get tables, RLS, grants, seeds) reflecting desired state, not history. `migrations/NNN_slug.sql` are incremental and idempotent (`ADD COLUMN IF NOT EXISTS`). Both are updated together via a `/migrate` skill adapted from `../pinia/.agents/skills/migrate` (schema name swapped to `stuffbox`). **Never hand-edit `db.sql` outside this flow.**

## Skills

Reused as-is from `../skills` and reference projects' `.agents/skills/`: `frontend-design`, `shadcn`, `tailwind-design-system`, `make-skill`, `notify`. Adapted: `/migrate` (from pinia). Skills live at `.agents/skills/<name>/` with a `.claude/skills/<name>` symlink, matching the pinia/bins convention.
