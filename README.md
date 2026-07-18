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
