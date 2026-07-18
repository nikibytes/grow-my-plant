"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeafData } from "./Leaf";

export function LeafSearch({
  leaves,
  onFound,
  onClear,
}: {
  leaves: LeafData[];
  onFound: (leaf: LeafData) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^@/, "");
    if (!t) {
      onClear();
      return [];
    }
    return leaves
      .filter((l) => l.username.toLowerCase().includes(t))
      .slice(0, 6);
  }, [q, leaves, onClear]);

  // Live magic: as the user types, highlight the single matching leaf
  // immediately so the golden glow appears the instant a name is found.
  useEffect(() => {
    const t = q.trim().toLowerCase().replace(/^@/, "");
    if (t.length >= 1 && matches.length === 1) {
      onFound(matches[0]);
      setPicked(matches[0].id);
      setMessage(`✨ Found @${matches[0].username}!`);
    } else if (t.length >= 1 && matches.length > 1) {
      setMessage(`Keep typing — ${matches.length} leaves match…`);
    } else if (t.length >= 1 && matches.length === 0) {
      setMessage("No leaf yet — comment 🌱 on the Reel to grow one!");
    } else {
      setMessage(null);
    }
  }, [q, matches, onFound]);

  const choose = (leaf: LeafData) => {
    onFound(leaf);
    setPicked(leaf.id);
    setMessage(`✨ Found @${leaf.username}!`);
  };

  return (
    <section className="mx-auto mt-6 w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches.length === 1) choose(matches[0]);
          else if (matches.length > 1) choose(matches[0]);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find your leaf — type your @username"
          className="flex-1 rounded-full border border-leaf/40 bg-white/80 px-4 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/30"
          aria-label="Search your username"
        />
        <button
          type="submit"
          className="rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white shadow hover:bg-leaf-dark"
        >
          Find
        </button>
      </form>

      {message && (
        <p className="mt-2 text-center text-xs text-bark/70">{message}</p>
      )}

      {matches.length > 1 && (
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => choose(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  picked === m.id
                    ? "bg-amber-300 text-amber-900"
                    : "bg-leaf-light text-leaf-dark hover:bg-leaf/30"
                }`}
              >
                @{m.username}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
