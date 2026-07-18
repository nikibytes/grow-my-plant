"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlantStream, type LiveLeaf } from "@/lib/realtime/subscribe";
import { hashString } from "@/lib/leaves/calculateLeafStyle";
import {
  GROWTH_STAGES,
  stageForCount,
  nextStage,
} from "@/lib/plant/growthStages";
import type { GrowthStage } from "@/lib/plant/growthStagesTypes";
import { STAGE_SKELETONS } from "@/lib/plant/stageSkeletons";
import { STAGE_SIZES } from "@/lib/plant/stageSizes";
import { placeLeaves } from "@/lib/plant/leafPlacement";

const FULL_VIEWBOX = { x: 0, y: 0, w: 640, h: 700 };
const ZOOM_HALF = 95; // half-size of the zoomed square around a leaf

// ── Locked scene geometry (from sampleUI.html — do not redesign) ──
const LEAF_PATH = "M0,-14 C7,-9 8,3 0,15 C-8,3 -7,-9 0,-14 Z";
const VEIN_PATH = "M0,-11 L0,11";

// All leaf slots for the active stage: deterministic placement along that
// stage's branch skeleton (see lib/plant/leafPlacement.ts). SAME count + stage
// => SAME positions, so search/zoom and refresh are stable.
function allSlotsForStage(stage: GrowthStage, count: number) {
  const branches = STAGE_SKELETONS[stage.id] ?? [];
  if (branches.length === 0) return stage.slots.slice(0, count);
  const size = STAGE_SIZES[stage.id];
  return placeLeaves(branches, count, 0, { vh: size?.vh, soilBand: 44 });
}

const AVATAR_COLORS = [
  "var(--amber)",
  "var(--moss-light)",
  "var(--bark)",
  "var(--moss-dark)",
  "var(--amber-soft)",
];

// ── Data shapes ──
export type GardenLeafData = {
  id: string;
  username: string;
  displayUsername: string;
  createdAt: string;
  comment: string;
};

function toGardenLeaf(l: {
  id: string;
  username: string;
  displayUsername: string;
  createdAt: string;
  commentText?: string | null;
}): GardenLeafData {
  return {
    id: l.id,
    username: l.username,
    displayUsername: l.displayUsername,
    createdAt: l.createdAt,
    comment: l.commentText ?? "",
  };
}

function shortNameOf(username: string): string {
  const base = username.replace(/^@/, "").split(/[._]/)[0];
  return base.length > 8 ? base.slice(0, 8) : base;
}

// ── Reusable leaf template (the locked visual shape) ──
function GardenLeaf({
  id,
  x,
  y,
  angle,
  name,
  comment,
  shortName,
  isNew,
  found,
  onEnter,
  onLeave,
}: {
  id: string;
  x: number;
  y: number;
  angle: number;
  name: string;
  comment: string;
  shortName: string;
  isNew: boolean;
  found: boolean;
  onEnter: (e: React.MouseEvent<SVGGElement> | React.FocusEvent<SVGGElement>) => void;
  onLeave: () => void;
}) {
  return (
    <g
      key={id}
      className={found ? "leaf found" : "leaf"}
      transform={`translate(${x},${y})`}
      tabIndex={0}
      role="button"
      data-name={name}
      data-comment={comment}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <circle className="leaf-halo" r={28} />
      <g className={isNew ? "leaf-body new-leaf" : "leaf-body"}>
        <path
          className="blade"
          d={LEAF_PATH}
          transform={`rotate(${angle}) scale(1)`}
          fill="var(--moss-light)"
        />
        <path
          d={VEIN_PATH}
          transform={`rotate(${angle}) scale(1)`}
          stroke="var(--moss-dark)"
          strokeWidth={1}
          opacity={0.5}
          fill="none"
        />
        <text textAnchor="middle" y={found ? 30 : 26}>
          {found ? name : shortName}
        </text>
      </g>
    </g>
  );
}

export function CommentGarden({
  slug,
  campaignName = "Comment Garden",
  initialLeaves = [],
}: {
  slug: string;
  campaignName?: string;
  initialLeaves?: GardenLeafData[];
}) {
  const [phase, setPhase] = useState<"day" | "night">("day");
  const [leaves, setLeaves] = useState<GardenLeafData[]>(initialLeaves);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{ name: string; comment: string; x: number; y: number } | null>(null);

  // ── Search / zoom-to-leaf ──
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [searchMiss, setSearchMiss] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const vbRef = useRef({ x: 0, y: 0, w: 640, h: 700 });
  const rafRef = useRef<number | null>(null);

  // Reconcile with the server on mount (initial props may be stale).
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/campaigns/${slug}/leaves`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.leaves)) setLeaves(d.leaves.map(toGardenLeaf));
      })
      .catch(() => {});
  }, [slug]);

  // Live updates: a 🌱 comment anywhere adds a leaf here in real time.
  const onLeaf = useCallback((leaf: LiveLeaf) => {
    setLeaves((cur) => (cur.some((l) => l.id === leaf.id) ? cur : [...cur, toGardenLeaf(leaf)]));
    setNewIds((cur) => new Set(cur).add(leaf.id));
    window.setTimeout(
      () => setNewIds((cur) => {
        const n = new Set(cur);
        n.delete(leaf.id);
        return n;
      }),
      6000
    );
  }, []);

  usePlantStream(slug, onLeaf);

  // Stable ordering: oldest first so leaf #i always maps to garden slot #i.
  const ordered = useMemo(
    () => [...leaves].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [leaves]
  );
  const total = ordered.length;

  // Growth stage driven by real comment/leaf count.
  // Dev-only override (debugStageId) lets us preview any stage instantly.
  const [debugStageId, setDebugStageId] = useState<string | null>(null);
  const countStage = useMemo(() => stageForCount(total), [total]);
  const activeStage =
    (debugStageId && GROWTH_STAGES.find((s) => s.id === debugStageId)) || countStage;
  const upcoming = useMemo(() => nextStage(total), [total]);
  const stage = {
    cur: { name: activeStage.name },
    next: upcoming ? { min: upcoming.minComments } : null,
  };

  // All leaf positions for the active stage, recomputed when stage or count changes.
  const slots = useMemo(
    () => allSlotsForStage(activeStage, total),
    [activeStage, total]
  );

  // viewBox for the active stage (its own canvas size so nothing is cropped).
  const viewBox = useMemo(() => {
    const s = STAGE_SIZES[activeStage.id];
    return s ? `0 0 ${s.vw} ${s.vh}` : "0 0 640 700";
  }, [activeStage]);

  // Live contributors: most recent 5 unique usernames.
  const contributors = useMemo(() => {
    const seen = new Map<string, number>();
    for (const l of ordered) seen.set(l.username, (seen.get(l.username) ?? 0) + 1);
    return [...seen.entries()].slice(-5).reverse();
  }, [ordered]);

  // Initial phase from time of day
  useEffect(() => {
    const h = new Date().getHours();
    setPhase(h >= 6 && h < 19 ? "day" : "night");
  }, []);

  // Starfield (generated once)
  const stars = useMemo(
    () =>
      Array.from({ length: 50 }, () => ({
        size: 1 + Math.random() * 1.6,
        top: Math.random() * 62,
        left: Math.random() * 100,
        delay: Math.random() * 3,
      })),
    []
  );

  const showTip = (el: React.MouseEvent<SVGGElement> | React.FocusEvent<SVGGElement>) => {
    const g = el.currentTarget;
    const r = g.getBoundingClientRect();
    setTooltip({
      name: g.dataset.name ?? "",
      comment: g.dataset.comment ?? "",
      x: r.left + r.width / 2,
      y: r.top - 6,
    });
  };
  const hideTip = () => setTooltip(null);

  // Animate the SVG viewBox from its current value to a target (rAF tween).
  const animateViewBox = useCallback(
    (target: { x: number; y: number; w: number; h: number }, ms = 850) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const svg = svgRef.current;
      if (!svg) return;
      const start = { ...vbRef.current };
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        vbRef.current = { ...target };
        svg.setAttribute("viewBox", `${target.x} ${target.y} ${target.w} ${target.h}`);
        return;
      }
      const t0 = performance.now();
      const ease = (p: number) => 1 - Math.pow(1 - p, 3); // easeOutCubic
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        const e = ease(p);
        const cur = {
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
          w: start.w + (target.w - start.w) * e,
          h: start.h + (target.h - start.h) * e,
        };
        vbRef.current = cur;
        svg.setAttribute("viewBox", `${cur.x} ${cur.y} ${cur.w} ${cur.h}`);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    []
  );

  // Reset zoom to the full tree and clear the focus.
  const resetZoom = useCallback(() => {
    setFocusedId(null);
    const s = STAGE_SIZES[activeStage.id];
    animateViewBox(s ? { x: 0, y: 0, w: s.vw, h: s.vh } : FULL_VIEWBOX);
  }, [animateViewBox, activeStage]);

  // Find a leaf by username and zoom the viewBox onto its slot.
  const runSearch = useCallback(
    (raw: string) => {
      const q = raw.trim().replace(/^@/, "").toLowerCase();
      if (!q) {
        resetZoom();
        setSearchMiss(false);
        return;
      }
      // exact match first, then startsWith, then includes
      const idx =
        ordered.findIndex((l) => l.username.toLowerCase() === q) !== -1
          ? ordered.findIndex((l) => l.username.toLowerCase() === q)
          : ordered.findIndex((l) => l.username.toLowerCase().startsWith(q)) !== -1
          ? ordered.findIndex((l) => l.username.toLowerCase().startsWith(q))
          : ordered.findIndex((l) => l.username.toLowerCase().includes(q));
      if (idx === -1) {
        setSearchMiss(true);
        setFocusedId(null);
        const s = STAGE_SIZES[activeStage.id];
        animateViewBox(s ? { x: 0, y: 0, w: s.vw, h: s.vh } : FULL_VIEWBOX);
        return;
      }
      setSearchMiss(false);
      const leaf = ordered[idx];
      const slot = slots[idx];
      const vw = STAGE_SIZES[activeStage.id]?.vw ?? 640;
      const zoomHalf = Math.round(vw * 0.14); // ~28% of width in view
      setFocusedId(leaf.id);
      animateViewBox({
        x: slot.x - zoomHalf,
        y: slot.y - zoomHalf,
        w: zoomHalf * 2,
        h: zoomHalf * 2,
      });
    },
    [ordered, animateViewBox, resetZoom, activeStage]
  );

  // Clean up any in-flight animation on unmount.
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const isDev = process.env.NODE_ENV !== "production";

  // Dev-only UI preview: sprout a leaf on the tree WITHOUT persisting.
  // (process.env.NODE_ENV is inlined by Next.js, so this is stripped in prod.)
  const simulate = () => {
    if (!isDev) return;
    const username = `guest_${Math.random().toString(36).slice(2, 7)}`;
    const id = `ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const preview: GardenLeafData = {
      id,
      username,
      displayUsername: username,
      createdAt: new Date().toISOString(),
      comment: "🌱 dev preview leaf",
    };
    setLeaves((cur) => [...cur, preview]);
    setNewIds((cur) => new Set(cur).add(id));
    window.setTimeout(
      () => setNewIds((cur) => {
        const n = new Set(cur);
        n.delete(id);
        return n;
      }),
      6000
    );
  };

  return (
    <div className="app" data-phase={phase}>
      <div className="sky-day" />
      <div className="sky-night" />
      <div className="grain" />

      <div className="stars">
        {stars.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              top: `${s.top}%`,
              left: `${s.left}%`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="sun" />
      <div className="moon" />

      <div className="hills">
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            className="hill-far"
            d="M0,120 C150,80 300,140 450,100 C600,60 750,130 900,90 C1000,70 1100,110 1200,90 L1200,200 L0,200 Z"
          />
          <path
            className="hill-near"
            d="M0,160 C180,120 320,170 480,140 C650,110 800,165 960,130 C1080,105 1150,140 1200,130 L1200,200 L0,200 Z"
          />
        </svg>
      </div>

      <div className="ground" />

      <div className="fireflies">
        <div className="firefly a" style={{ top: "64%", left: "22%" }} />
        <div className="firefly b" style={{ top: "70%", left: "58%" }} />
        <div className="firefly c" style={{ top: "56%", left: "70%" }} />
      </div>

      <div className="day-critters">
        <div className="butterfly b1" style={{ top: "20vh", left: "14%" }}>
          <svg viewBox="0 0 20 16">
            <path className="wing" fill="var(--amber)" d="M10,8 C6,0 -2,2 2,8 C-2,14 6,16 10,8 Z" />
            <path className="wing" fill="var(--amber)" d="M10,8 C14,0 22,2 18,8 C22,14 14,16 10,8 Z" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="#241C12" strokeWidth="1" />
          </svg>
        </div>
        <div className="butterfly b2" style={{ top: "26vh", right: "16%" }}>
          <svg viewBox="0 0 20 16">
            <path className="wing" fill="var(--moss-light)" d="M10,8 C6,0 -2,2 2,8 C-2,14 6,16 10,8 Z" />
            <path className="wing" fill="var(--moss-light)" d="M10,8 C14,0 22,2 18,8 C22,14 14,16 10,8 Z" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="#241C12" strokeWidth="1" />
          </svg>
        </div>
        <div className="ladybug">
          <svg viewBox="0 0 18 14">
            <ellipse cx="9" cy="8" rx="8" ry="6" fill="#C0392B" />
            <path d="M9,2 L9,14" stroke="#241C12" strokeWidth="1" />
            <circle cx="9" cy="4" r="3" fill="#241C12" />
            <circle cx="5" cy="7" r="1.2" fill="#241C12" />
            <circle cx="13" cy="7" r="1.2" fill="#241C12" />
            <circle cx="6" cy="11" r="1.1" fill="#241C12" />
            <circle cx="12" cy="11" r="1.1" fill="#241C12" />
          </svg>
        </div>
      </div>

      <div className="leaf-search">
        <form
          className="leaf-search-row"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <input
            type="text"
            value={query}
            placeholder="find your leaf — type your @username"
            aria-label="Search for your username"
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              if (v.trim() === "") resetZoom();
            }}
          />
          {focusedId || query ? (
            <button
              type="button"
              className="leaf-search-btn"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setSearchMiss(false);
                resetZoom();
              }}
            >
              ✕
            </button>
          ) : (
            <button type="submit" className="leaf-search-btn" aria-label="Search">
              ⌕
            </button>
          )}
        </form>
        {searchMiss && (
          <span className="leaf-search-hint miss">
            no leaf yet for “{query.trim()}” — comment 🌱 to grow one
          </span>
        )}
        {focusedId && !searchMiss && (
          <span className="leaf-search-hint">found it ✨ — tap ✕ to zoom back out</span>
        )}
      </div>

      <div className="title-block">
        <h1>{campaignName}</h1>
        <p className="subtitle">
          current stage: <strong>{stage.cur.name}</strong> &middot;{" "}
          <span>{total}</span> leaves grown &middot;{" "}
          <span>{stage.next ? `next milestone ${stage.next.min} leaves` : "canopy fully grown"}</span>
        </p>
      </div>

      <div className="contrib-card">
        <h2>Leaf contributors</h2>
        <p className="contrib-label">recent contributors</p>
        <ul className="contrib-list">
          {contributors.length === 0 && (
            <li className="contrib-row" style={{ opacity: 0.7 }}>
              <span className="contrib-handle">no leaves yet</span>
            </li>
          )}
          {contributors.map(([handle, count]) => (
            <li key={handle} className="contrib-row">
              <span
                className="contrib-avatar"
                style={{ background: AVATAR_COLORS[hashString(handle) % AVATAR_COLORS.length] }}
              >
                {handle.replace(/^@/, "").charAt(0).toUpperCase()}
              </span>
              <span className="contrib-handle">@{handle}</span>
              <span className="contrib-count">
                <svg viewBox="0 0 16 16">
                  <path
                    d="M8,1 C9,5 14,5 14,9 C14,13 10,15 8,15 C6,15 2,13 2,9 C2,5 7,5 8,1 Z"
                    fill="var(--moss-light)"
                  />
                </svg>
                {count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="controls">
        <button className="ctrl-btn" onClick={() => setPhase((p) => (p === "day" ? "night" : "day"))}>
          <span className="phase-dot" />
          <span>{phase === "day" ? "preview night" : "preview day"}</span>
        </button>
        {isDev && (
          <button className="ctrl-btn" onClick={simulate}>
            + simulate a comment
          </button>
        )}
      </div>

      {isDev && (
        <div className="stage-tester" role="group" aria-label="Dev stage tester">
          <span className="stage-tester-label">stage tester (dev)</span>
          <div className="stage-tester-row">
            {GROWTH_STAGES.map((s, i) => (
              <button
                key={s.id}
                className={
                  "stage-tester-btn" + (activeStage.id === s.id ? " active" : "")
                }
                title={`${s.name} · ≥${s.minComments} leaves`}
                onClick={() => setDebugStageId(s.id)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={"stage-tester-btn reset" + (debugStageId ? "" : " active")}
              title="Follow real leaf count"
              onClick={() => setDebugStageId(null)}
            >
              auto
            </button>
          </div>
          <span className="stage-tester-name">
            {activeStage.name}
            {debugStageId ? " (forced)" : " (live)"}
          </span>
        </div>
      )}

      <div className="plant-wrap">
        <svg
          ref={svgRef}
          id="plant"
          className={focusedId ? "has-focus" : undefined}
          viewBox={viewBox}
          role="img"
          aria-label="An illustrated tree whose leaves each carry the name of someone who commented"
        >
          <ellipse cx="320" cy="672" rx="150" ry="16" fill="#000" opacity="0.12" />
          {/* Growth-stage tree art (transparent PNG, trunk base at 320,660).
              Cross-fades when the stage changes as leaves accumulate. */}
          {GROWTH_STAGES.map((s) => (
            <image
              key={s.id}
              href={s.img}
              x={0}
              y={0}
              width={STAGE_SIZES[s.id]?.vw ?? 640}
              height={STAGE_SIZES[s.id]?.vh ?? 700}
              preserveAspectRatio="none"
              className="stage-img"
              style={{
                opacity: s.id === activeStage.id ? 1 : 0,
                transformOrigin: `${(STAGE_SIZES[s.id]?.baseX ?? 320)}px ${(STAGE_SIZES[s.id]?.baseY ?? 660)}px`,
              }}
            />
          ))}
          <g id="leaves">
            {ordered.map((leaf, i) => {
              const slot = slots[i];
              return (
                <GardenLeaf
                  key={leaf.id}
                  id={leaf.id}
                  x={slot.x}
                  y={slot.y}
                  angle={slot.angle}
                  name={`@${leaf.username}`}
                  comment={leaf.comment || `🌱 from @${leaf.username}`}
                  shortName={shortNameOf(leaf.username)}
                  isNew={newIds.has(leaf.id)}
                  found={focusedId === leaf.id}
                  onEnter={showTip}
                  onLeave={hideTip}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {tooltip && (
        <div className="tooltip show" style={{ left: tooltip.x, top: tooltip.y }}>
          <span className="name">{tooltip.name}</span>
          <span>{tooltip.comment}</span>
        </div>
      )}
    </div>
  );
}
