# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is pre-scaffold: no `package.json`/Next app yet. What already exists ahead of the scaffold: `stuffbox-plan.md` (the full spec — read it in full before any implementation work), `db.sql` + `migrations/`, the skills in `.agents/skills/`, and a handful of `src/` modules staged for when the app is scaffolded (services, providers, hooks — see below). Everything in this file is a condensed operating guide derived from the plan; when the two disagree, the plan wins and this file should be updated to match.

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

When scaffolding shadcn/ui, use the owner's saved preset (Base UI, not Radix):

```
pnpm dlx shadcn@latest init --preset b5uFb8gHlI --template next --pointer
```

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

### The `<ClientComponent>` wrapper (critical, read before touching `src/app/layout.js` or providers)

`'use client'` alone does not skip SSR — a client component still pre-renders on the server and hydrates, which is where hydration errors come from. `src/app/layout.js` is the **only** real Server Component (minimal `<html><body>{children}</body></html>`). Immediately inside it, a `'use client'` provider wrapper, mounted-gated (`useState`+`useEffect` gate returning `null` until mounted), holds **all** providers: `QueryProvider` → `NuqsAdapter` → `BusProvider` → `DeviceProvider` → `DebugProvider` → `ThemeProvider` → `AuthProvider`. Everything below is client-only by inheritance. Accepted cost: the gated subtree isn't in initial HTML (skeleton until hydrate) — fine, since this is an inventory app behind login with no SEO surface.

## Stack

Plain JavaScript (JSX) — **no TypeScript, ever**; convert any `.tsx` registry block to `.jsx` on install. Tailwind v4 (CSS-based `@theme` config, no `tailwind.config.js`). shadcn/ui on **Base UI** (`@base-ui/react`), not Radix. Icons: multi-library — **Phosphor** (`@phosphor-icons/react`, imported from its `/ssr` subpath — the default entry isn't SSR-safe per Phosphor's own Next.js guidance — library code `phosphor`) is the primary set used everywhere in the actual UI (buttons, spinner, sidebar, dialogs, identity tag, default entity icons). Hugeicons (`@hugeicons/react` + `@hugeicons/core-free-icons`, code `huge`) was the primary set until the full migration to Phosphor and remains available in `DynamicIcon` as an option, same as Lucide (`lucide-react`, code `lucide`) and Lucide Lab (`@lucide/lab`, code `lucide-lab`, for anything ported as-is from pinia/bins). All four resolved via one `DynamicIcon` component (`src/ui/dynamic-icon.jsx`) from `icon` jsonb `{library, name}` — dispatches on `library` to the matching renderer; icon names use the `XxxIcon` suffix convention for both `huge` and `phosphor` (both export each icon bare and suffixed). `DynamicIcon` always applies a `size-4` default (via `cn()`, so an explicit `className` still wins) — each library's own unset-size fallback differs (Phosphor: `1em`, font-relative; Hugeicons/Lucide: fixed 24px), which made the same icon visibly change size just from switching `library` wherever a caller forgot an explicit size class (e.g. dropdown option rows). Default per-type icons (locations, etc.) live in `src/constants/location-icons.js`, keyed on Phosphor names. Maps: mapcn (`https://mapcn.dev`) — a real shadcn-style registry, not an npm package (registered in `components.json` under `registries`, installed via `npx shadcn@latest add @mapcn/map`; see stuffbox-plan.md §3 for the quirk where it writes to `src/components/ui/` instead of our `ui` alias, requiring a manual move to `src/ui/map.jsx`). Full component (`Map`, markers, popups, routes, arcs, GeoJSON, clusters), `lucide-react` icons swapped for Phosphor. Basemap is mapcn's own Carto default, not a custom MapTiler style. Land routes via OpenRouteService, air routes via geodesic arc (`@turf/turf`). Storage: Cloudflare R2, direct-from-client upload via presigned URL. Avatars: DiceBear, style `micah`. AI summaries: Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`) against OpenRouter, model set via `OPENROUTER_MODEL`.

### Code conventions (shared across all Danne reference projects — follow exactly)

- JS only, no `.ts`/`.tsx`, no JSDoc types. `export const` for everything.
- `useRef` vars: `$` prefix, no `Ref` suffix. `async/await`, never `.then()`.
- kebab-case files/folders. Components PascalCase, hooks camelCase `use…`.
- Layout: `src/components/` (domain-subfoldered), `src/ui/` (flat primitives), `src/helpers/` (pure functions only, not `lib/`; `cn()` at `src/helpers/utils.js`), `src/services/` (stateful/side-effecting modules — see Services pattern below), `src/hooks/`, `src/constants/`, `src/queries/` (TanStack Query factories, per-entity CRUD), `src/providers/`, `src/css/` (Tailwind v4 `@custom-variant` files). Routes under `src/app/` (Next's `src/` dir convention — everything, routes included, lives under `src/`).
- Event bus (`BusProvider`: `useEvents`/`useListener`/`useEmitter`) instead of prop drilling — this is how the select→picker→confirm flow (LocationPicker) communicates across the tree.
- `cn()` with objects for conditional classes — never ternaries, never template-literal class strings.
- Runtime values via CSS custom properties + Tailwind var syntax (`bg-(--x)` + `style={{ '--x': v }}`) — never `style={{ color }}`.
- Icons sized via `[&>svg]:size-X`, never the Lucide `size` prop. `size-X` over `w/h`. `rem` over `px`. Tailwind scale over arbitrary `[...]`. Every `shadow-*` needs an explicit color.
- Loading/empty/error as named early-return components (use `match()` from utils), not inline `{isLoading && …}`.
- Every component mobile-first: unprefixed = mobile, `sm:`/`lg:`/`xl:` layered up.
- Dark mode via shadcn `dark` variant + semantic tokens; single `color` per entity (no light/dark split), resolve contrast in UI.
- TanStack Query factory pattern (`myQuery = (opts) => ({ queryKey, queryFn, ...opts })`) co-located with mutations in `src/queries/*.js`. `mutationFn` calls Supabase directly, or a Route Handler only for R2/AI/email.
- **`data-block="BlockName"` on every important block, primitive, or section** — added since this makes it easy to identify pieces of the DOM in the inspector while debugging together. Apply going forward on new components; don't do a retroactive sweep of everything at once.

### Services pattern (from bins, `../bins/src/services/`)

`src/services/` holds stateful or side-effecting modules that are neither pure functions (`src/helpers/`) nor TanStack Query factories (`src/queries/`) — local-storage-backed state, one-shot orchestration routines, future third-party integrations (ntfy, etc). Shape: one file per concern, plain `const fn = (...) => {...}` at module scope (no classes, no factory wrappers), exported either as a single namespace object bundling the public API (`settings`, `cache`) or as named exports when there's no need for a cohesive namespace. Storage-backed services follow a `get`/`set`/`subscribe` triad; `settings.js` additionally exposes `registerDevTools()` (attaches `window.settings` for console debugging — call it once, e.g. in a dev-only provider effect).

Ported so far:

- `src/services/settings.js` + `src/hooks/use-settings.js` — localStorage, dot-path keys (`useSettings('theme', 'system')`), cross-tab sync via `BroadcastChannel` + `storage` event. Defaults live in `src/constants/default-settings.js`, which starts with just `theme` and `debug` — settings get added here as features need them, not pre-declared.
- `src/services/cache.js` — same shape, flat keys, no path notation, no cross-tab sync (simpler, non-critical caching).
- `src/services/provision-account.js` — see Account provisioning below.
- Depends on `src/helpers/objects.js` (`getByPath`/`setByPath`) and `src/helpers/strings.js` (`trim`) — pure functions, hence `helpers/` not `services/`.

### Local settings (current)

- `theme` — `'system'` (default) | `'light'` | `'dark'`. Applied by `ThemeProvider` (`src/providers/theme-provider.jsx`) as the shadcn-standard `.dark` class on `<html>`; `'system'` tracks `prefers-color-scheme` live.
- `debug` — boolean, default `false`. Applied by `DebugProvider` (`src/providers/debug-provider.jsx`) as `data-debug` on `<html>` (consumed by `src/css/variants.css`'s `debug:` variant and `src/css/debug.css`'s outline rule). No visual overlay yet — pinia's center crosshair was specific to its map pin editor; stuffbox's own debug affordance is still TBD.
- `mapDefaultViewport` — `{ center: [lng, lat], zoom }`, default CDMX at zoom 14. Read directly via `useSettings` in `LocationMapPicker` (`src/components/locations/location-map-picker.jsx`) as the first-open viewport, before the user clicks/drags/locates — no dedicated provider, no settings-page control yet.

### DeviceProvider (from bins/pinia, `src/providers/device-provider.jsx`)

Sets `data-browser`/`data-os`/`data-device`/`data-touch` on `<html>` once (detection in `src/helpers/ua-parser.js`, plain UA-string sniffing — no vendor/bot metadata, unlike bins, since stuffbox has no public content to protect), and `data-page` on every navigation (first path segment via Next's `usePathname()`, defaulting to `'home'` for `/`). All of it is consumed by the matching `@custom-variant` rules in `src/css/variants.css` (`chrome:`, `mobile:`, `ios:`, `touch:`, `page-workspace:`, etc.) — add a `page-*` variant there whenever a new top-level route is added.

### JsonViewer (from pinia, `src/ui/json-viewer.jsx`)

Debug-mode payload inspector — wraps `@microlink/react-json-view` in the shadcn `ScrollArea`. Use it to inspect raw payloads (query results, mutation variables, webhook bodies) behind the `debug` setting, not as a general-purpose data display.

### UI primitives & patterns (decided while building the location browser + sidebar)

- **Dropdowns over native `<select>`** — use `DropdownMenu` (`src/ui/dropdown-menu.jsx`, Base UI `@base-ui/react/menu`) for any choice list (type pickers, theme toggle, workspace switcher). Never a bare `<select>`.
- **Tooltips over `title` attrs** — use `Tooltip`/`TooltipTrigger`/`TooltipContent` (`src/ui/tooltip.jsx`) for icon-only affordances. `TooltipProvider` is mounted once, globally, in `src/providers/providers.jsx` — don't wrap it locally per usage.
- **`ResponsiveDialog`** (`src/ui/responsive-dialog.jsx`) — one API (`ResponsiveDialog(Trigger|Content|Header|Title|Description|Footer|Close)`) that renders a centered `Dialog` on desktop and a bottom `Drawer` (vaul, `src/ui/drawer.jsx`) on mobile via `useIsMobile()` (`src/hooks/use-mobile.js`, 768px breakpoint). Use this instead of `Popover` for anything that's really a form (e.g. "agregar casa/dentro" — see `CreateLocationDialog`). `Popover` stays for lightweight, non-form pickers (color swatch, icon grid). Trigger/Close take a `render` element (Base UI convention) even under the Drawer branch, which internally translates to vaul's `asChild`.
- **Sidebar** (`src/ui/sidebar.jsx`, ported from `../bins/src/ui/sidebar.jsx` — full shadcn Sidebar primitive suite: provider, mobile `Sheet` fallback, collapsible-icon mode, keyboard shortcut). The app composition lives in `src/components/layout/`: `app-sidebar.jsx` (workspace switcher header, Casas/Mudanzas/Ajustes nav, theme toggle + profile card footer), `workspace-switcher.jsx` (`DropdownMenu` of workspaces with a colored initial-avatar per workspace — color is `resolveWorkspaceColor`/`src/helpers/workspace-color.js`, the owner-set `workspaces.color` or a stable client-side hash fallback — plus a "crear nuevo" item that opens a sibling `ResponsiveDialog`, not nested inside the menu item, to avoid the menu-close/dialog-open race), `theme-toggle.jsx` (a `Tabs` segmented switcher, not a dropdown — Claro/Oscuro/Sistema, each tab wrapped in a `Tooltip`), `profile-menu.jsx`.
- **`IconPicker`** (`src/ui/icon-picker.jsx`, ported from pinia's lucide-only version, extended to all four `DynamicIcon` libraries) — searchable, tabbed by library (Phosphor/Hugeicons/Lucide/Lucide Lab). Search data lives in `src/constants/{phosphor,huge,lucide,lucide-lab}-icons.js`, each `[{name, tags}]`; lucide/lucide-lab have real tag metadata (from lucide-static's `tags.json`, ported from pinia), huge/phosphor don't (no upstream source for it) so search on those two only matches the name. Regenerate the huge/phosphor lists if those package versions change meaningfully (see the generation comment atop each file). Used wherever a user picks a custom icon (e.g. `/house/new`) — default per-type icons still come from `DEFAULT_LOCATION_ICONS`, not this picker.
- Icon-chrome inside ported primitives (dialog/sheet close X, sidebar panel toggle, map controls) uses Phosphor (`XIcon`, `SidebarIcon`, etc.) per the primary icon-set decision, even though the upstream bins/pinia versions use `lucide-react` or Hugeicons for that chrome.

### Visual design system (added during the app-wide redesign pass)

- **`flourish`** — a warm amber-orange brand token (`--flourish`/`--flourish-foreground` in `src/app/globals.css`, exposed as `bg-flourish`/`text-flourish`/`border-flourish`/`ring-flourish` etc.) that pairs with the existing violet `primary` — used for pack/move-related accents (moves list, packed-tape motif, label wizard) and other warm secondary highlights. `primary` stays dominant; `flourish` accents.
- **`bg-hero-mesh`** (`src/app/css/utilities.css`) — a soft two-tone radial-gradient wash (violet top-left, amber top-right) built from `color-mix(in oklch, ...)` so it's theme-aware with no `dark:` override needed. Used on every page-hero card (home, workspace/location/move detail, admin, auth).
- **`Stat`** (`src/ui/stat.jsx`) — a small icon+value+label reading (`<Stat icon={SomeIcon} value={n} label='...'/>`), the repeated unit inside hero headers and the admin dashboard.
- **Hero header pattern** — `rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10` card with an icon avatar, a `font-heading text-xl/2xl font-semibold tracking-tight` title (the only place the heading font is sized up past the `text-lg` used everywhere else), and a `Stat` row below. Established on `workspace/[id]`, `location/[id]`, `move/[id]`, and reused on admin/auth/collaborators/settings.
- **`PackedTape`/`PackedTapeTop`/`MoveTag`** (`src/components/moves/packed-tape.jsx`) — the plan's "modern skeuomorphism reserved for the pack/unpack moment" (§11): the tape strips now key off `flourish` instead of hardcoded amber, and `PackedTapeTop` takes `moveId`/`moveName` to render `MoveTag`, a small hanging "printed paper tag" (same dashed-border language as `IdentityTag`) with a one-shot `animate-tag-swing` settle (`src/app/css/anims.css`), linking to the move.
- Card/row recipe used for list rows and clickable cards app-wide: `rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10`.
- `Empty`/`EmptyMedia` (`src/ui/empty.jsx`) icon variant is tinted per domain via `className` (e.g. `bg-primary/10 text-primary`, `bg-flourish/15 text-flourish`) instead of a flat muted box everywhere; the box itself grew to `size-12 rounded-2xl` with a subtle ring and an `animate-in fade-in-0 zoom-in-95` entrance.
- Loading states are content-shaped `Skeleton` (`src/ui/skeleton.jsx`) compositions matching the eventual layout, not a bare centered `Spinner`.

### Account provisioning

Signing up does not auto-provision anything at the DB level — no `auth.users` trigger. `AuthProvider` must call `ensureAccountProvisioned(supabase, user)` from `src/services/provision-account.js` on every authenticated session (not only right after `signUp()` — if email confirmation is on, there's no session/`auth.uid()` until the user actually confirms). The service creates `profiles`/`workspaces`/`workspace_members`/seeded `option_lists` directly as client-side inserts and is idempotent — each step checks before writing, so it can safely re-run on every login.

## Data model (schema `stuffbox` in Supabase)

One schema per project. Two id strategies, decided during initial `db.sql` work: `workspaces`, `locations`, `moves`, and `items` use a client-generated `nanoid(8)` text PK (short, URL-friendly — these are exactly the entities addressed directly by app routes and QR deep links). Every other table uses a standard `uuid` PK generated by Postgres (`gen_random_uuid()` default); `profiles` is the one exception, its `uuid` mirrors `auth.users.id` rather than being generated. Safe either way because everything sits behind auth + RLS, not id secrecy.

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

A single FK means an item/box can't be in two moves at once by construction. Boxed items inherit their box's move state — to pack a boxed item into a _different_ move, it must first leave the box (become loose).

## LocationPicker + bulk actions (the most important component)

Pack, unpack, transfer, and bulk are one UI shape matching the one DB operation above: multi-select of items/boxes, plus a navigable LocationPicker (breadcrumb + drill-down through the unbounded tree, "dejar aquí" at any level, recurses into boxes) reused for unpack destination, pack-into-box, and transfer target. Selection state and picker communicate via the **event bus**, not prop drilling — this is the reason `BusProvider` is in the stack.

## Route Handlers (the only server-side code)

Exactly four, each holding a secret that must not reach the client — everything else is client + direct Supabase:

```
POST /api/uploads/presign    # R2 secret → presigned PUT urls
POST /api/uploads/optimize   # R2 secret → list + delete unreferenced R2 objects (manual button, no cron)
POST /api/summary            # OpenRouter key → generate/refresh a box's ai_summary (Vercel AI SDK)
POST /api/labels/email       # Resend key → email the client-built label PDF
```

If any outgrows Vercel free limits, the documented escape hatch is a serverless worker outside Vercel (Cloudflare, or `../endpoints`) — not the main path.

Photo pipeline is entirely client-side before upload: rotate per EXIF into pixels then strip it, resize to a configurable max dimension, strip metadata, convert to JPEG — all in one canvas round-trip, before the presign call.

## Admin

`is_super_admin` on `profiles` gates an `AdminLayout` (nav tabs + live counts) that sees every workspace/user with full CRUD. It works with **no service key and no separate admin API** — the super-admin's normal client session already satisfies the `requesting_user_is_admin()` RLS policy on every table, so direct-from-client CRUD just works at admin scope too. Table views (`workspaces`, `users`) keep all filter/sort/page state in nuqs, per the bins pattern.

## Schema workflow

`db.sql` is the canonical, self-contained schema (fresh Supabase project → run it → get tables, RLS, grants, seeds) reflecting desired state, not history. `migrations/NNN_slug.sql` are incremental and idempotent (`ADD COLUMN IF NOT EXISTS`). Both are updated together via a `/migrate` skill adapted from `../pinia/.agents/skills/migrate` (schema name swapped to `stuffbox`). **Never hand-edit `db.sql` outside this flow.**

## Skills

Reused as-is from `../skills` and reference projects' `.agents/skills/`: `frontend-design`, `shadcn`, `tailwind-design-system`, `make-skill`, `notify`, `notify-test` (from pinia — sends a secret test push notification to verify ntfy delivery without ever exposing the secret in a visible tool call), `sync-instructions` (from pinia — keeps CLAUDE.md/AGENTS.md/docs in sync, per the Development process rule above). Adapted: `/migrate` (from pinia). Skills live at `.agents/skills/<name>/` with a `.claude/skills/<name>` symlink, matching the pinia/bins convention.
