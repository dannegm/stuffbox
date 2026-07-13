# STUFFBOX — Plan (Next.js, single repo)

> Single Next.js (latest, App Router) repo, deployed on Vercel **free tier**. Supabase for DB/Auth, Cloudflare R2 for storage.
> This is a plan. No code is written here — it is the spec to hand to Claude Code.
> The repo `stuffbox` is created by the owner afterward (do not scaffold files now).

## Reference projects (paths on the owner's machine, for the implementing AI)

These are existing Danne projects used as style/architecture references. When this doc says "like bins" or "pinia's pattern", read from these paths:

- **endpoints** — `/Users/danielgarcia/Desktop/Workspace/endpoints` — the old Bun/Express monorepo. **No longer used for stuffbox** (everything moves into this Next repo). Kept only as an escape hatch for serverless-outside-Vercel if ever needed.
- **bins** — `/Users/danielgarcia/Desktop/Workspace/bins` — closest reference: Vite+React SPA, Supabase + RLS, direct-from-client CRUD, admin area (tables, stats, nuqs), settings page, DiceBear avatars. The admin look here is the target.
- **pinia** — `/Users/danielgarcia/Desktop/Workspace/pinia` — icon-picker (`{library,name}` jsonb), map patterns (mapcn/MapLibre), route fetching, providers/utilities.
- **aura** — `/Users/danielgarcia/Desktop/Workspace/aura` — providers, settings service, ntfy.
- **skills** — `/Users/danielgarcia/Desktop/Workspace/skills` — shared skill sources.

---

## 1. What stuffbox is

A personal household inventory app that ships with move-planning features. Long term it's a general inventory (multiple houses, arbitrary nested locations — rooms, shelves, drawers, warehouses, boxes — holding items). A move is a temporary state layered on top, not the core.

UI language **Spanish**. Code, identifiers, DB columns, comments **English**. No i18n layer (no react-i18next) — Spanish strings live in the components. (bins is bilingual; here we intentionally skip i18n.)

---

## 2. Architecture — the shape

**Effectively a SPA. Next is the bundler + host; Vercel free tier is the constraint that drives every choice.**

- **Latest Next.js, App Router.** But we avoid Server Components as much as possible.
- **CRUD goes directly from the client to Supabase, guarded by RLS** — exactly like bins. No API layer, no Server Actions for CRUD.
- **Auth:** Supabase Auth via `@supabase/ssr`. Session lives in cookies transparently (browser client persists + sends it; RLS filters with that JWT automatically). A light Next **middleware** refreshes the token when it expires (Supabase's recommended App-Router pattern, ~15 lines, touches no app logic). Login is `supabase.auth.signInWithPassword()` on the client — no cookie-store→server→client dance needed (that was the old workaround; `@supabase/ssr` handles it).
- **Server-side is used only where a secret must not reach the client:**
    - **R2 presign** (needs R2 secret key)
    - **AI box summary** (needs LLM API key)
      These are **Route Handlers** (`src/app/api/.../route.js`). Everything else is client-side. If either ever outgrows Vercel's free limits, move it to a serverless worker outside Vercel (e.g. Cloudflare, co-located with R2 for zero egress) or the old `endpoints` repo — documented escape hatch, not the main path.
- **PDF generation: 100% client-side** (`@react-pdf/renderer` `pdf().toBlob()`), so zero serverless cost for labels. **QR: client-side** (`qrcode`).
- **State:** TanStack Query for everything (loading/error/caching/invalidation). No RSC data loading.
- **Freshness (no realtime):** TanStack Query refetch — `refetchOnWindowFocus`, refetch on relevant interactions and after mutations, manual refresh buttons (bins' `RefreshCw` pattern). No Yjs, no Supabase Realtime subscriptions.

### The `<ClientComponent>` wrapper (critical)

`'use client'` alone does **not** skip SSR — a client component still pre-renders on the server and hydrates, which is where hydration errors come from. To force a subtree to be client-only (so the event bus, `window`-dependent providers, etc. never run on the server):

```
'use client'
// ClientComponent wrapper
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null   // or a skeleton
return children
```

- The root `src/app/layout.js` is the only real Server Component — minimal, just `<html><body>{children}</body></html>`.
- Immediately inside, a `'use client'` provider wrapper mounted-gated as above holds **all** providers: `QueryProvider` → `NuqsAdapter` → `BusProvider` → `DeviceProvider` → `AuthProvider`. Everything below is client by inheritance.
- Cost (accepted): gated subtree isn't in initial HTML (skeleton until hydrate), and no SEO there — irrelevant for an inventory app behind login.

---

## 3. Stack

- **Next.js latest (App Router), plain JavaScript (JSX). No TypeScript, ever.** Convert any `.tsx` registry block to `.jsx` on install.
- **Package manager: pnpm. Node 24.**
- **Server state:** TanStack Query, factory pattern (`myQuery = (opts) => ({ queryKey, queryFn, ...opts })`) co-located with mutations in `src/queries/*.js`. `mutationFn` calls Supabase directly (or a Route Handler for R2/AI).
- **URL state:** nuqs (filters, sort, pagination, panel state).
- **Styling:** Tailwind CSS v4, CSS-based config (`@theme`, no `tailwind.config.js`).
- **UI primitives:** shadcn/ui on **Base UI** (`@base-ui/react`), not Radix. Check `src/ui/` + registry before writing custom.
- **Icons:** Lucide (+ Lucide-lab). `icon` jsonb `{ library, name }` resolved via a `DynamicIcon` component (like pinia).
- **Maps:** mapcn (`@mapcn/map`, MapLibre) — check mapcn's `llms.txt` inventory before building map features. Basemap via hosted MapTiler style.
- **Directions:** OpenRouteService (land routes), plain `fetch`. Air routes = geodesic arc via `@turf/turf` (or mapcn `Arcs`), pure math, no API.
- **Storage:** Cloudflare R2 (S3-compatible), direct-from-client upload via presigned URL (presign is the one Route Handler that needs the secret).
- **Auth:** `@supabase/ssr`. **First Danne project with real accounts** — no prior login pattern to copy, but it's standard Supabase.
- **Avatars:** DiceBear, style **`micah`** (human-like, unlike bins' abstract `rings` — this is why `gender` is a real field here).
- **Deployment:** Vercel free tier, manual by owner.

### Code conventions (identical across reference projects)

- JS only, no `.ts`/`.tsx`, no JSDoc types. `export const` for everything.
- `useRef` vars: `$` prefix, no `Ref` suffix. `async/await`, never `.then()`.
- kebab-case files/folders. Components PascalCase, hooks camelCase `use…`.
- `src/components/` (domain-subfoldered), `src/ui/` (flat primitives), `src/helpers/` (not `lib/`; `cn()` at `src/helpers/utils.js`), `src/hooks/`, `src/constants/`, `src/queries/`, `src/providers/`. Routes under `src/app/` (everything, routes included, lives under `src/`).
- Event bus (`BusProvider`: `useEvents`/`useListener`/`useEmitter`) instead of prop drilling — used for the select→picker→confirm flow (§7).
- `cn()` with objects for conditional classes, never ternaries, never template-literal class strings.
- Runtime values via CSS custom properties + Tailwind var syntax (`bg-(--x)` + `style={{ '--x': v }}`), never `style={{ color }}`.
- Icons sized via `[&>svg]:size-X`, never Lucide `size` prop. `size-X` over `w/h`. `rem` over `px`. Tailwind scale over arbitrary `[...]`. Every `shadow-*` needs an explicit color.
- Loading/empty/error as named early-return components (use `match()` from utils), not inline `{isLoading && …}`.
- **Every component mobile-first:** unprefixed = mobile, `sm:`/`lg:`/`xl:` layered up.
- **Dark mode supported** (shadcn `dark` variant + semantic tokens). Single `color` per entity (no light/dark split); resolve contrast in UI.

### Standing utilities to port (from the reference projects)

`cache`, `settings` (localStorage, path-based, cross-tab via BroadcastChannel), `useSettings`, `ntfy`/`useNtfy` (optional), `BusProvider`, `DeviceProvider` (sets `data-browser/os/device`), `match()`/`cn()`/`delay()` in `utils.js`, lazy-singleton Supabase browser client factory. Plus new: `AuthProvider` (session), the `<ClientComponent>` wrapper.

---

## 4. Data model (schema `stuffbox` in Supabase)

One schema per project. **Updated id strategy (decided during initial `db.sql` work, supersedes the earlier all-nanoid plan):** `workspaces`, `locations`, `moves`, and `items` — the entities addressed directly by app routes and QR deep links — use a client-generated `nanoid(8)` text PK, short and URL/label-friendly (like `bins.bins.id`). Every other table uses a conventional `uuid` PK generated by Postgres (`gen_random_uuid()` default); `profiles` is the one exception, its `uuid` mirrors `auth.users.id`. Guessing an id grants nothing either way: everything is behind auth + RLS.

### `profiles` (mirrors `auth.users`; password never stored — Supabase Auth owns it)

`uuid` PK (= auth.users.id) · `name` · `email` (mirror) · `gender` (random@signup, editable; feeds DiceBear) · `avatar_seed` · `color` (single) · `is_super_admin` bool default false (app-wide admin, DB-only editable) · `created_at` · `updated_at`

### `workspaces` (collaboration container; auto-created per user on signup)

`id` PK · `name` · `owner_id` → profiles.uuid · timestamps

### `workspace_members`

`workspace_id` → workspaces (cascade) · `user_id` → profiles.uuid · `joined_at` · PK `(workspace_id, user_id)`. No role column — owner & guest share permissions, except only `owner_id` may remove members (enforced client-side + RLS).

### `workspace_invites` (shareable link, no email)

`id` PK · `workspace_id` (cascade) · `token` unique (random nanoid) · `max_uses` int default 1 · `uses_count` int default 0 · `expires_at` default `now()+7d` · `invited_by` → profiles.uuid · `created_at`

### `locations` (generic unbounded tree — house/room/closet/shelf/drawer/warehouse/box are all nodes; box = `type='box'`; multiple roots = multiple houses; boxes can nest)

`id` PK · `workspace_id` (cascade) · `parent_id` → locations self (nullable, cascade) · `name` · `type` (free text) · `icon` jsonb `{library,name}` · `lat`,`lng` double (nullable; meaningful on roots for routes) · `active_move_id` → moves (nullable; set when packed) · `ai_summary` text (nullable, cached, regenerable) · timestamps

### `items`

`id` PK · `workspace_id` (cascade) · `location_id` → locations (cascade) **required, exactly one at a time** · `name` · `description` (nullable) · `quantity` int default 1 · `condition` (ref → option_lists, nullable) · `serial_number` (nullable) · `purchase_price` numeric (nullable) · `acquired_month` int (nullable) · `acquired_year` int (nullable) · `sentimental_value` smallint 1–5 (nullable, hearts) · `is_fragile` bool default false · `storage_orientation` (ref → option_lists, nullable) · `icon` jsonb (nullable, own fallback icon) · `active_move_id` → moves (nullable; **loose items only** — boxed items inherit their box's move state) · timestamps
No-photo icon priority: photo → item.icon → first tag icon → `Package2`.

### `item_photos` (square-masked at render, never physically cropped)

`id` PK · `item_id` → items (cascade) · `r2_key` (`{workspace_id}/uploads/{photo_id}.jpg`) · `crop_x` float 0 · `crop_y` float 0 · `zoom` float 1 · `order` int 0 · `created_at`
`crop_*`/`zoom` = react-easy-crop pan/zoom output (UI only, never its canvas export); defaults = centered/cover.

### `tags` (predefined categories, multi per item)

`id` PK · `workspace_id` (cascade) · `name` · `color` (single) · `icon` jsonb · `created_at`

### `item_tags`

`item_id` → items (cascade) · `tag_id` → tags (cascade) · PK `(item_id, tag_id)`

### `moves` (requires ≥2 root locations; route geometry NOT stored — computed live client-side)

`id` PK · `workspace_id` (cascade) · `name` · `origin_location_id` → locations (a root) · `destination_location_id` → locations (a root) · `route_type` `'land'`|`'air'` · `status` · timestamps

### `option_lists` (generic per-workspace configurable lists — one mechanism, not one table per field)

`id` PK · `workspace_id` (cascade) · `field` `'condition'`|`'orientation'` · `value` · `sort_order` · `created_at`
Seeded defaults per workspace:

- condition: New, Like new, Good, Used, Worn, Damaged, Needs repair, Restored, Vintage, Out of service, To discard
- orientation: No restriction, This side up, Lay flat, Do not tilt, Do not stack

### Settings (3 DB levels; env + localStorage are the other two)

- `app_settings` — `key` PK · `value` jsonb · `updated_at`
- `workspace_settings` — `workspace_id` · `key` · `value` jsonb · `updated_at` · PK `(workspace_id, key)`
- `user_settings` — `profile_id` → profiles.uuid · `key` · `value` jsonb · `updated_at` · PK `(profile_id, key)`
  Full model: env < app < workspace < user < localStorage. Cascade resolution when a key repeats is **deferred** to the first real multi-level key (flagged, not silently assumed).

### `movement_log` (written by a Postgres trigger AFTER UPDATE of location_id/parent_id/active_move_id — not app logic)

`id` PK · `workspace_id` · `entity_type` `'item'`|`'location'` · `entity_id` · `from_location_id`,`to_location_id` (nullable) · `move_id` (nullable) · `created_at`

---

## 5. RLS (adopted from bins — `/Users/danielgarcia/Desktop/Workspace/bins/db.sql`)

Since CRUD is direct-from-client, **RLS is the actual authorization layer** (not decorative). Workspaces are private: visible only to owner or member. The rule applies to every `workspace_id` table, so it lives in Postgres, applying automatically to any table added later.

- `stuffbox.is_workspace_member(workspace_id, auth.uid())` — `security definer stable`, avoids recursive RLS.
- `stuffbox.requesting_user_is_admin()` — mirrors bins'; returns `profiles.is_super_admin` for `auth.uid()`, `security definer stable`.
- Every table gets two permissive policies (Postgres ORs them):
    1. `"<table>: member access"` — `USING (is_workspace_member(...))` (+ `WITH CHECK`).
    2. `"<table>: admin full access"` — `FOR ALL USING (requesting_user_is_admin()) WITH CHECK (...)`.
- `profiles`: self-select + member-visible-in-shared-workspaces + admin; only owner updates own row; `is_super_admin` never client-editable.
- `app_settings`: **SELECT = any authenticated** (client must read it to apply config); writes admin only. (Admin-only _UI_ visibility is frontend-only; the value is readable by design.)
- `workspace_settings`: member + admin. `user_settings`: `profile_id = auth.uid()` + admin.
- Grants block copied from bins (`GRANT … TO authenticated, service_role` + `ALTER DEFAULT PRIVILEGES`). **No `anon` grants** — zero public content.
- Invite claim atomicity: `UPDATE … WHERE uses_count < max_uses AND now() < expires_at RETURNING *` (increment in the same query, no read-then-write race). The invite **landing** only SELECTs (bot-safe against link unfurlers); only the "Unirse" button runs the claim.

**NOT copied from bins** (they solve problems stuffbox lacks): the delete-`auth.users`-on-profile-delete trigger (removing a member ≠ deleting an account); `is_bot`/`ip_hash`/geo/user-agent columns + bot/anon cleanup crons (no anonymous users); `anon` grants.

---

## 6. Pack / unpack / transfer — one operation

Packing, unpacking, transferring between rooms, and bulk actions are **the same DB write**: set `location_id` and/or `active_move_id` on a batch of item/box ids (done directly against Supabase from the client).

- **Transfer** = set `location_id`, leave `active_move_id`.
- **Pack** = set `active_move_id`; `location_id` untouched (box still "lives" at origin, just flagged). Packed filter = `active_move_id IS [NOT] NULL`.
- **Unpack** = set `location_id` = chosen destination + clear `active_move_id`. No migration, two fields, one transaction (Supabase call).
- **Bulk** = same with an array of ids.

Because move membership is a single FK, an item/box can't be in two moves at once (free from structure). Boxed items inherit their box's move state; to pack a boxed item into a different move it must first leave the box (become loose). Unpack targets any tree level (root / room / container) — the LocationPicker resolves it.

---

## 7. Core interaction: LocationPicker + bulk actions

The most important component. Pack, unpack, transfer, and bulk are one UI shape (matching the one DB operation):

- **Multi-select** of items/boxes.
- A **navigable LocationPicker** (breadcrumb + drill-down through the unbounded tree, with "dejar aquí" at any level; recurses into boxes too) to pick the destination — reused for unpack destination, pack-into-box, and transfer target. One navigation pattern app-wide.
- Selection state ↔ picker communicate via the **event bus** (select in one place, picker opens elsewhere, confirm elsewhere) — the reason the bus is in the stack.
- House view has an **empacado / sin empacar** toggle to spot what's still unpacked before a move.

---

## 8. Feature areas

**House / location browser** — multiple houses (roots); each house its own config; drill in; transfer items/boxes between rooms/containers; packed filter.

**Items** — full field set (§4). **"Guardar y crear otro"** on the create form (fast repetitive entry). Tags many-to-many (color + icon). Condition/orientation from editable `option_lists`.

**Photos (client owns processing, then direct R2 upload):**

- Native picker `<input type="file" accept="image/*" multiple capture>`; multiple photos.
- **No crop step.** Store original; display square via mask; save `{crop_x,crop_y,zoom}` (react-easy-crop UI only). Default centered/cover. Optional "adjust" view to pan/zoom the mask; we save the reference, never cut the image. (iOS can't show a square guide while shooting — accepted, we mask after.)
- **Pipeline before upload (one canvas round-trip):** rotate per EXIF (bake into pixels, then strip — don't rely on the orientation tag surviving), resize to max (default 2000px long side, configurable), strip metadata, convert to JPEG.
- Then: `POST /api/uploads/presign` (Route Handler, holds R2 secret) → `[{photo_id, upload_url}]` → client PUTs directly to R2 → `item_photos` rows inserted (with keys + crop defaults) only when the item is saved. Key `{workspace_id}/uploads/{photo_id}.jpg`; `photo_id` server-generated at presign; no `item_id` dependency during upload. `Content-Type` at presign must match the PUT header (`image/jpeg` both sides).

**Optimize storage (manual button in settings)** — `POST /api/uploads/optimize` (Route Handler): lists R2 objects for the workspace, compares against every `item_photos.r2_key`, deletes unreferenced. Manual (not cron), no grace period. Covers deleted item / remnant / photo removed in edit / abandoned upload. Immediate deletion on photo-remove / item-delete is the primary path; this is the safety net. Show what will be deleted / freed before confirming (irreversible). (No R2 lifecycle rule — it would also delete attached photos since keys never move.)

**Tags & option lists** — tags workspace-scoped (name/color/icon, multi per item); icon picker like pinia's. Condition & orientation editable per-workspace, seeded.

**Moves (planner)** — create (needs ≥2 roots; origin+destination both roots, house or warehouse). Map (mapcn/MapLibre) shows the route: **land** → ORS line; **air** → geodesic arc. Geometry computed live client-side, never stored. Pack items/boxes into the move; unpack transfers to a chosen destination via LocationPicker (single items or whole boxes). Two moves can carry different objects to different destinations.

**AI box summaries** — label rule: `IF a location has 4+ direct children THEN show an AI summary; ELSE show nothing`. Cached in `locations.ai_summary`, generated on box-open or content change via `POST /api/summary` (Route Handler, holds the OpenRouter key; uses Vercel AI SDK's `generateText()` against `OPENROUTER_MODEL`), **not** at print time. "Regenerar" action refreshes. ~200 chars.

**Labels (builder → client-side PDF)** — two-step builder: (1) select what's packed in the move; (2) select which of those get a printed label (skip nested boxes). One multi-page **A4** PDF, white bg / black content, **2×3 grid** (~90×90mm cells), QR ~4cm. Per label: QR (always) + name + summary (only when the 4+ rule fires; else nothing) + fragile icon (red, bold) + orientation icon (black, always up). Generated **client-side** (`@react-pdf/renderer` `pdf().toBlob()`), QR client-side (`qrcode`). Three actions on the same bytes: **imprimir** (open blob → native print), **descargar** (download), **enviar por correo** (this one needs a Route Handler + Resend, since email sending isn't client-side; it's the only label path touching the server).

**Collaborators** — owner generates a shareable invite **link** (configurable `max_uses` default 1, `expires_at` default +1 week); no email flow. `src/app/invite/[token]` landing is read-only (bot-safe); "Unirse" runs the claim (after login/signup if needed). Owner removes members at will. Workspaces private to owner/members (RLS).

**Settings (bins pattern: stacked sections + side nav, danger zone last)** — identity/profile (name; avatar gender/seed/color random@signup, editable), appearance (theme/dark), workspace settings, **"Optimizar almacenamiento"** button. 5-level settings (env < app < workspace < user < localStorage); local level via the `settings` service. Cascade deferred to first real conflict.

---

## 9. Admin (bins is the direct inspiration — `/Users/danielgarcia/Desktop/Workspace/bins`, the admin look wanted)

- `AdminLayout`: header with nav tabs + live counts, gated by `useAdmin()` (`profiles.is_super_admin`), redirect non-admins.
- Tables (`workspaces`, `users`): stats cards on top; filterable / sortable / paginated; **all table state in nuqs** (`filter`, `sort`, `dir`, `page`, `per_page`); refresh button invalidating queries; destructive actions via confirm popover.
- Admin sees everything — all workspaces + contents, all users + related data, DB-stored global settings — full CRUD.
- **How admin bypasses RLS with direct-from-client CRUD:** the two admin operations that need to cross workspace boundaries rely on the `requesting_user_is_admin()` RLS policy (present on every table), so a super-admin's normal client session already sees/edits everything — no service key on the client, no separate admin API. `is_super_admin` gates both the RLS policy (data) and the UI (visibility). `app_settings` UI is admin-only; regular users never see it exists, though the app reads its values to apply config (data-layer fact; hiding is UI-only).

---

## 10. Route Handlers (the only server-side code)

Everything else is client-side + direct Supabase. These exist because they hold a secret:

```
POST /api/uploads/presign    # R2 secret → returns presigned PUT urls
POST /api/uploads/optimize   # R2 secret → list + delete unreferenced objects
POST /api/summary            # OpenRouter key → generate/refresh a box's ai_summary (Vercel AI SDK)
POST /api/labels/email       # Resend key → email the client-built PDF (client sends the blob)
```

If any outgrows Vercel free limits → move to a serverless worker outside Vercel (Cloudflare near R2, or the old `endpoints` repo at `/Users/danielgarcia/Desktop/Workspace/endpoints`). Documented escape hatch, not the plan.

Deep links from QR: `src/app/i/[id]` → item, `src/app/l/[id]` → location (thin client redirects into the detail views).

---

## 11. Routes (App Router, `src/app/` — Next's `src/` dir convention, everything including routes lives under `src/`)

```
src/app/layout.js            # ONLY server component: minimal <html><body>
src/app/(providers)          # 'use client' ClientComponent wrapper + all providers (mounted-gate)
src/app/page.js              # dashboard: default workspace → default house
src/app/login/page.js        # returning user only — no identity tag, just email + code
src/app/register/page.js     # new account — editable identity tag (name/avatar) + email + code
src/app/invite/[token]/page.js  # read-only landing; identity tag if no session, else just "Unirse"
src/app/workspace/[id]/page.js  # workspace / house browser (core view)
src/app/location/[id]/page.js   # location contents + transfer UI
src/app/item/[id]/page.js       # item detail
src/app/moves/page.js           # move list
src/app/move/[id]/page.js       # move planner: map + route + pack/unpack + label builder
src/app/settings/page.js        # stacked sections + side nav
src/app/admin/page.js           # redirect → /admin/workspaces
src/app/admin/workspaces/page.js
src/app/admin/users/page.js
src/app/i/[id]/page.js          # QR deep link → item redirect
src/app/l/[id]/page.js          # QR deep link → location redirect
src/app/api/uploads/presign/route.js
src/app/api/uploads/optimize/route.js
src/app/api/summary/route.js
src/app/api/labels/email/route.js
src/proxy.js                 # Supabase session refresh (Next's proxy convention, formerly middleware.js)
```

Design language: shadcn/Base-UI minimalist baseline, with **"modern skeuomorphism"** reserved for the pack/unpack moment (a box that opens/closes as the packing affordance) — everything else flat and quiet (frontend-design skill's "one signature element"). Default entity icons (Lucide, editable): house→`Home`, room→`DoorOpen`, box→`Box`, shelf/library→`Library`, closet→`Shirt`, drawer→`Archive`, warehouse→`Warehouse`, kitchen→`UtensilsCrossed`, bathroom→`Bath`, office→`Briefcase`, garage→`Car`; fallbacks: location→`Folder`, item→`Package2`, tag→`Tag`.

---

## 12. Schema workflow (adopt pinia's `/migrate` — `/Users/danielgarcia/Desktop/Workspace/pinia/.agents/skills/migrate`)

- `db.sql` = canonical, self-contained schema (fresh Supabase project → run it → everything: tables, RLS, grants, seeds). Reflects desired state, not history.
- `migrations/NNN_slug.sql` = incremental, idempotent (`ADD COLUMN IF NOT EXISTS`), `-- Run in Supabase SQL Editor` header, no transactions.
- Both updated in the same step via a `/migrate` skill adapted for schema `stuffbox` (copy pinia's, swap `pinia`→`stuffbox`). Never hand-edit `db.sql` outside this flow.
- Skill lives at `.agents/skills/migrate/` + symlink `.claude/skills/migrate` (the `.agents/skills/<name>/` convention, like pinia/bins).

---

## 13. Dependencies

**New:** `@react-pdf/renderer`, `qrcode`, `react-easy-crop`, `@turf/turf` (or mapcn `Arcs`), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Route Handler side), `resend`, `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider`, DiceBear, `@microlink/react-json-view` (debug-mode payload inspector, ported from pinia).
**Standard:** `next`, `@base-ui/react`, `@tanstack/react-query`, `nuqs`, `tailwindcss` v4, `@mapcn/map` + `maplibre-gl`, `@supabase/supabase-js` + `@supabase/ssr`, `lucide-react` + `@lucide/lab`, `nanoid`, `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge`, `date-fns`. **No `react-i18next`.**

## 14. Env vars

```
# client (VITE-less; Next uses NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Supabase renamed anon key → publishable key; check the exact label in your project's dashboard
NEXT_PUBLIC_ORS_API_KEY=
NEXT_PUBLIC_MAPTILER_KEY=
NEXT_PUBLIC_NTFY_TOPIC=          # optional
# server-only (Route Handlers)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=               # full https://<account_id>.r2.cloudflarestorage.com — account id is redundant as a separate var, it's already in this URL
RESEND_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=          # e.g. anthropic/claude-sonnet-4.5
OPENROUTER_BASE_URL=       # optional — @openrouter/ai-sdk-provider defaults to https://openrouter.ai/api/v1
STUFFBOX_MAX_IMAGE_DIMENSION=2000
```

## 15. Development process (owner's standing rule)

One feature at a time → implement → **stop** → owner tests manually → confirm → next. No automated tests. **Never run git add/commit/push** — owner handles git. Keep CLAUDE.md / AGENTS.md / docs in sync (sync-instructions skill).

## 16. Skills to reuse (in the new repo, `.agents/skills/<name>/` + symlink)

- As-is: `frontend-design`, `shadcn`, `tailwind-design-system`, `make-skill`, `notify` (sources in `/Users/danielgarcia/Desktop/Workspace/skills` and the reference projects' `.agents/skills/`).
- Adapt: `/migrate` (from pinia, swap schema to `stuffbox`).
- Not applicable: `create-theme` (no code editor), `gen-tips` (no tips carousel).
- `gen-http` (from `endpoints`) **no longer applies** — there's no Express router; the only server endpoints are Route Handlers.

## 17. Open items (decide before/at first use, not silently assumed)

- ~~DiceBear style~~ — decided: `micah` (human-like); `gender` feeds it.
- Settings cascade resolution across the 5 levels — deferred to the first real multi-level key.
