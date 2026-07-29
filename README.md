# Grow My Plant

A Next.js web app where every 🌱 comment grows a leaf on a shared community
tree. The tree matures through six growth stages as comment count climbs, and
each leaf carries the name of the person who commented.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for the database / realtime leaf stream
- **MediaPipe**-free, pure SVG tree rendering (no canvas deps for the garden)

## Getting started

```bash
npm install
cp .env.example .env      # fill in Supabase + Instagram credentials
npm run dev               # http://localhost:3000
```

## Useful scripts

| command | what it does |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run seed` | seed demo leaves into the database |
| `npm run simulate` | simulate one 🌱 comment without the HTTP layer |

## How the tree works
- `lib/plant/growthStages.ts` — the six stages, their `minComments` thresholds,
  canopy ellipses, and hand/auto leaf-anchor slots.
- `lib/plant/stageSkeletons.ts` — per-stage branch centerlines (auto-extracted).
- `lib/plant/leafPlacement.ts` — deterministic leaf placement along branches
  (same count + stage ⇒ same positions, so search/zoom/refresh stay stable).
- `lib/plant/stageSizes.ts` — per-stage canvas size + trunk base point.
- `components/CommentGarden.tsx` — the main scene: sky, tree art, and all the
  SVG leaves, plus dev-only stage tester + "simulate a comment" controls.

## Dev tips

- In dev (`NODE_ENV !== production`) a **stage tester** (buttons 1–6 + "auto")
  and a **"+ simulate a comment"** button appear so you can preview any stage
  and grow leaves without a real campaign.

## Project layout

```
app/            routes + global styles
components/      CommentGarden, Leaf, PlantCanvas, etc.
lib/             plant (stages/leaves), leaves, realtime, database, instagram
scripts/         seed, simulate, skeleton/slot extraction helpers
public/trees/    transparent tree PNGs per stage
supabase/        SQL migrations / schema
```

## Instagram webhook (grow a leaf from a real 🌱 comment)

Prereqs (Q2 — already satisfied): a Facebook Page with a connected
Instagram **Business/Creator** account, linked to a Meta App.

1. **Expose the callback.** In dev, tunnel localhost with ngrok:
   ```bash
   ngrok http 3000
   ```
   Copy the `https://….ngrok-free.app` URL into `INSTAGRAM_WEBHOOK_BASE_URL`.
2. **Set secrets** (`.env`): `INSTAGRAM_VERIFY_TOKEN`, `INSTAGRAM_APP_SECRET`
   (Meta App → Settings → Basic), and `INSTAGRAM_TARGET_MEDIA_ID` for the post.
3. **Verify the callback.** In the App's Webhooks panel, add a callback URL
   `<INSTAGRAM_WEBHOOK_BASE_URL>/api/instagram/webhook`, subscribe to the
   **User** object, and select the `comments` field. Meta calls `GET` with
   `hub.challenge`; the route echoes it only when `hub.verify_token` matches.
4. **Receive comments.** Meta POSTs to the same URL with an
   `X-Hub-Signature-256: sha256=<HMAC>` header. The handler recomputes the HMAC
   over the raw body with `INSTAGRAM_APP_SECRET` (constant-time compare) and
   rejects mismatches with `401`. Each `comments` change whose text contains 🌱
   is parsed (`lib/instagram/parseCommentEvent.ts`) and routed through the
   shared `processComment` path, growing a leaf on the matched campaign.

The endpoint ACKs `200` immediately and processes events async, so it satisfies
Meta's 20s delivery window regardless of DB latency.

### Development mode vs Live mode (read this before testing)

Meta apps start in **Development mode**. This is enough to build and test the
webhook end-to-end:

- ✅ Webhooks (incl. the `comments` subscription) are **active in dev mode**.
- ✅ The webhook fires for comments made by **you** and anyone with a **role on
  the Meta app** (admin / developer / tester). Your own 🌱 test comments will be
  delivered to your ngrok endpoint — **no App Review needed yet**.
- ⚠️ In dev mode the webhook only reacts to comments from people with an app
  role. Random Instagram users commenting 🌱 will **not** trigger it.
- 🚀 To let the public grow leaves, switch the app to **Live mode** and pass
  **App Review** for the comment/webhook permission (may also require business
  verification). That's a release-stage step, not a blocker for local testing.

**Bottom line:** for testing today (your account + ngrok) you need **nothing
extra** in the project — just expose the tunnel, set the secrets, and subscribe.
