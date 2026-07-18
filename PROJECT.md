# Grow My Plant — Project Documentation (Source of Truth)

> **Read this first.** This doc is the authoritative map of the codebase. When
> editing a module, read *this* file to find the exact files to touch — you do
> not need to read every file up front. Each section lists the files that own a
> behavior and what a change there cascades to.

---

## 1. What this app is

A single-page web app ("Comment Garden"). People comment **🌱** on a brand's
Instagram post; each qualifying comment grows a **leaf** on a live illustrated
tree, labelled with the commenter's Instagram username. The home page
(`/`) renders the garden; leaves appear in real time via Server-Sent Events.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 ·
  Framer Motion (installed, not currently used) · Node SQLite (default) or
  Supabase (opt-in).
- **Single page:** `/` is the whole site. There is also a `/plant/[slug]` legacy
  route (old React renderer) and `/admin` (campaign management) — both still
  functional but **not** the main experience.
- **No auth on the public side.** Admin uses `ADMIN_SECRET`.

---

## 2. Repository layout (where things live)

```
app/
  page.tsx                      ← HOME PAGE (renders CommentGarden)
  layout.tsx                    ← root layout, metadata
  globals.css                   ← ALL styling (Tailwind + raw CSS, see §6)
  plant/[slug]/page.tsx         ← LEGACY renderer (PlantClient). Not home.
  admin/page.tsx                ← admin UI
  api/
    instagram/webhook/route.ts  ← Instagram webhook (GET verify + POST comments)
    dev/simulate-comment/route.ts ← dev-only fake comment → real pipeline
    stream/[slug]/route.ts       ← SSE endpoint (live leaf push)
    campaigns/[slug]/route.ts    ← campaign read
    campaigns/[slug]/leaves/route.ts ← GET leaves (polling + SSE payload)
    leaves/[id]/route.ts         ← single leaf ops
    admin/*                      ← admin API (overview, campaigns, block)

components/
  CommentGarden.tsx             ★ MAIN UI — the garden, search, zoom, simulate
  PlantClient.tsx               ← LEGACY client (used by /plant/[slug])
  PlantCanvas.tsx / Leaf.tsx    ← LEGACY plant SVG (used by PlantClient)
  CampaignHeader.tsx / JoinInstructions.tsx / LeafSearch.tsx ← LEGACY

lib/
  config.ts                     ← all env access (single funnel)
  types.ts                      ← shared domain types (Campaign, Leaf, …)
  database/
    index.ts                    ← getRepo() factory (picks SQLite vs Supabase)
    repo-interface.ts           ← Repo contract (THE contract to honor)
    sqlite-repo.ts              ← default backend
    supabase-repo.ts            ← opt-in backend
  instagram/
    verifyWebhook.ts            ← Meta handshake verify
    parseCommentEvent.ts        ← raw payload → InstagramCommentEvent
  leaves/
    processComment.ts           ★ CORE funnel: comment → leaf (source-agnostic)
    createLeaf.ts               ← type only
    validateComment.ts          ← trigger/eligibility matching
    calculateLeafStyle.ts       ← deterministic leaf style from username hash
  moderation/moderateUsername.ts ← sanitize + prohibited-term check
  plant/
    anchors.ts                  ← 50 anchors for the LEGACY 200×300 plant
    stages.ts                   ← plant stage computation from leaf count
    leafSymbols.tsx             ← legacy leaf SVGs
  realtime/
    hub.ts                      ← in-process SSE broadcast (broadcastLeaf)
    subscribe.ts                ← client usePlantStream() hook (SSE→poll)
    useLiveLeaves.ts            ← alternate legacy hook (SSE→poll)

public/leaves/leaf-01..20.svg   ← legacy leaf art
scripts/seed-demo-leaves.ts     ← npm run seed
```

---

## 3. The data flow (the one diagram to memorize)

```
Instagram comment 🌱
   │
   ▼  POST /api/instagram/webhook
parseCommentEvent()  →  InstagramCommentEvent
   │
   ▼  processComment()            ← lib/leaves/processComment.ts  (THE FUNNEL)
   ├─ matches campaign by mediaId
   ├─ trigger check (validateComment)
   ├─ moderation (moderateUsername)
   ├─ blocked-user + one-leaf-per-user dedup
   ├─ insertLeaf()  →  repo
   ├─ recompute stage
   └─ broadcastLeaf(campaignId, leaf)   ← lib/realtime/hub.ts
          │
          ▼  SSE  /api/stream/[slug]   (event: "leaf")
   usePlantStream()  (lib/realtime/subscribe.ts)
          │
          ▼  CommentGarden  (components/CommentGarden.tsx)
     leaf appears on the tree, animated
```

**Dev shortcut:** `+ simulate a comment` button (dev only) →
`POST /api/dev/simulate-comment` → **same** `processComment()` funnel. So the
simulator exercises the exact production path without Instagram creds.

---

## 4. Files you will edit most

### `components/CommentGarden.tsx` — THE main UI (single source for `/`)
Owns: the garden SVG, leaf layout (`GARDEN_SLOTS` + `slotFor`), phase
day/night, contributors card, controls, **live data subscription**
(`usePlantStream`), dev simulate, and (planned) search/zoom.
- It receives `slug`, `campaignName`, `initialLeaves` from `app/page.tsx`
  (server-rendered) and also refetches `/api/campaigns/[slug]/leaves` on mount.
- Each leaf is placed at `slotFor(index)` where `index` = position in the
  `createdAt`-sorted list. **Changing `GARDEN_SLOTS` or `slotFor` changes where
  every leaf sits** — coordinate with anything that computes leaf positions
  (e.g. search/zoom lookups).

### `app/page.tsx` — HOME route (server component)
Resolves the first campaign (`repo.listCampaigns()[0]`), loads its visible
leaves, and renders `<CommentGarden>`. If no campaign exists, shows a "run
`npm run seed`" empty state. **Edit here to change what data the home page
loads or which campaign is "default".**

### `lib/leaves/processComment.ts` — THE core service
Turns a comment into a leaf. **Any change to leaf-creation rules (triggers,
dedup, moderation, status) lives here.** It is backend-agnostic — it calls
`repo.*` and `broadcastLeaf`. One function, pure-ish, idempotent on
`commentId`.

### `lib/database/repo-interface.ts` — THE contract
Every repo method the app calls is declared here. If you add a DB capability,
declare it here first, then implement in **both** `sqlite-repo.ts` and
`supabase-repo.ts`.

### `app/globals.css` — ALL styling
Tailwind layers + the entire Comment Garden visual language (sky, hills, sun,
moon, fireflies, leaves, tooltips, controls, search). Locked layout lives in
the CSS classes (`.app`, `#plant`, `.leaf`, etc.). **Editing garden geometry
means editing both `CommentGarden.tsx` (SVG coords) and the matching CSS.**

---

## 5. Module ownership table (edit X → also check Y)

| To change… | Edit | Also verify |
|---|---|---|
| Home page content/data | `app/page.tsx` | `components/CommentGarden.tsx` props |
| Garden look (tree, leaves, sky) | `components/CommentGarden.tsx` + `app/globals.css` | `.leaf`, `#plant`, `.app` CSS |
| Leaf placement | `GARDEN_SLOTS` / `slotFor` in `CommentGarden.tsx` | search/zoom (must use same slot math) |
| Who gets a leaf (rules) | `lib/leaves/processComment.ts` | `validateComment`, `moderateUsername` |
| Trigger word (🌱) | `campaign.triggerTerms` (DB) + `lib/leaves/validateComment.ts` | seed script default |
| Realtime push | `lib/realtime/hub.ts` + `app/api/stream/[slug]/route.ts` | `lib/realtime/subscribe.ts` |
| Client live updates | `lib/realtime/subscribe.ts` (`usePlantStream`) | `CommentGarden` usage |
| DB backend | `lib/database/index.ts` + both repos | `lib/config.ts` `DATABASE_PROVIDER` |
| Instagram payload shape | `lib/instagram/parseCommentEvent.ts` | `verifyWebhook.ts` |
| Username safety | `lib/moderation/moderateUsername.ts` | `processComment` step 5 |
| Leaf style/color | `lib/leaves/calculateLeafStyle.ts` | `GardenLeaf` fill in `CommentGarden` |
| Seed/demo data | `scripts/seed-demo-leaves.ts` | campaign slug `community-plant` |

---

## 6. Styling & the "locked layout" rule

- **All CSS is in `app/globals.css`.** There is no CSS-modules/Tailwind config
  beyond `tailwind.config.ts` (palette: `leaf`, `bark`, `sky`). The Comment
  Garden uses hand-written CSS classes, not Tailwind utilities.
- **Locked layout:** the `640×700` `#plant` SVG viewBox, the branch paths, and
  `GARDEN_SLOTS` are intentional and should not be redesigned. New features
  (search zoom, highlights) must **mold to this layout** (e.g. animate the
  `viewBox`, add overlays) rather than move the tree.
- **CSS variables** for the garden palette: `--moss`, `--moss-light`,
  `--moss-dark`, `--bark`, `--bark-dark`, `--amber`, `--amber-soft`, `--ink`.
- Day/night is driven by `.app[data-phase="day|night"]` — toggle `data-phase`
  to switch the whole scene.

---

## 7. Realtime (how a leaf appears live)

1. `processComment` calls `broadcastLeaf(campaignId, leaf)`
   (`lib/realtime/hub.ts`) — an in-process `Map<campaignId, Set<listener>>`.
2. `app/api/stream/[slug]/route.ts` subscribes to that campaign and streams
   `event: leaf` SSE messages (payload = leaf fields).
3. `lib/realtime/subscribe.ts` → `usePlantStream(slug, onLeaf)` opens an
   `EventSource`; on `leaf` it calls `onLeaf`. Falls back to polling
   `/api/campaigns/[slug]/leaves` every 5s if SSE errors.
4. `CommentGarden` uses `usePlantStream` to append the new leaf.

> **Multi-instance note:** the hub is in-process. For production with >1 server,
> swap `hub.ts` for Supabase Realtime / Ably / Pusher — the subscribe interface
> stays the same.

---

## 8. Environment & config (`lib/config.ts`)

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_PROVIDER` | `sqlite` | `supabase` to enable Supabase backend |
| `SQLITE_PATH` | `./data/grow-my-plant.db` | SQLite file |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase creds |
| `INSTAGRAM_VERIFY_TOKEN` | `dev-verify-token` | Meta webhook handshake |
| `INSTAGRAM_TARGET_MEDIA_ID` | — | media id the webhook matches |
| `INSTAGRAM_PERMALINK` | instagram.com | "comment here" link |
| `ADMIN_SECRET` | `dev-secret` | admin API auth |
| `ALLOW_SIMULATE` | — | set `1` to enable simulate in prod |
| `NODE_ENV` | — | `production` hides the simulate button |

Secrets live in `.env` (gitignored; see `.env.example`).

---

## 9. Common tasks (copy-paste starting points)

**Add a field to a leaf**
1. `lib/types.ts` (`Leaf`) → 2. `repo-interface.ts` (`InsertLeafInput`) →
3. both repos (`insertLeaf`) → 4. `processComment.ts` (pass it) →
5. leaves API (`app/api/campaigns/[slug]/leaves/route.ts`) →
6. `CommentGarden.tsx` (render it).

**Change the trigger emoji**
- Set `campaign.triggerTerms` (DB). `validateComment.ts` does substring match.
- Seed default is `["🌱"]` in `scripts/seed-demo-leaves.ts`.

**Add a new realtime event type**
- Emit in `hub.ts` style; add an SSE case in `app/api/stream/[slug]/route.ts`;
  listen in `subscribe.ts`.

**Run locally**
```
npm install
npm run seed          # creates campaign "community-plant" + 12 demo leaves
npm run dev           # http://localhost:3000
```
- Kill any stale `next` processes before restarting (port 3000/3001 collisions
  cause `Cannot find module './xxx.js'` / `pages-manifest.json` errors). Fix:
  `taskkill /PID <pid> /F`, delete `.next`, `npm run dev`.

**Build / verify**
```
npm run build         # full type-check + lint + static gen
npx tsc --noEmit      # types only
```
> Always stop the dev server and `rm -rf .next` before `npm run build`; a running
> dev server corrupts the build cache.

---

## 10. Pitfalls (learned the hard way)

- **Stale dev server + build = broken `.next`.** Kill dev, delete `.next`, then
  build/run. Symptoms: `ENOENT ... pages-manifest.json`, `Cannot find module`.
- **`taskkill` needs single slash** (`/PID`, not `//PID`) in git-bash.
- **Terminal is git-bash/MSYS**, not PowerShell — PowerShell builtins fail.
- **Leaf placement is index-based:** leaf N → `slotFor(N)` in `createdAt` order.
  Don't reorder `ordered` without re-mapping slots, or leaves jump.
- **Simulate button is dev-only** and (per latest decision) adds a **UI-only**
  preview leaf — it does NOT write to the DB. The `/api/dev/simulate-comment`
  endpoint still performs a real DB write (used for true pipeline testing).
- **One-leaf-per-user** and **trigger match** are the two most common reasons a
  comment is ignored — check `processComment` return `reason` when debugging.

---

## 11. File-change blast radius cheat-sheet

- Editing **`processComment.ts`** → affects webhook + simulate + any future
  ingester. Highest-impact file.
- Editing **`repo-interface.ts`** → must update `sqlite-repo.ts` AND
  `supabase-repo.ts` or the build breaks.
- Editing **`CommentGarden.tsx` `GARDEN_SLOTS`/`slotFor`** → affects every leaf
  position + anything computing leaf coordinates (search/zoom).
- Editing **`globals.css` `.leaf`/`#plant`/`.app`** → affects the entire garden
  visual; pair with `CommentGarden.tsx` SVG.
- Editing **`app/page.tsx`** → changes what the home route loads for the whole
  site.
