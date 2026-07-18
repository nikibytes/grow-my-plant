"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface LeafData {
  id: string;
  username: string;
  displayUsername: string;
  leafStyle: number;
  anchorIndex: number;
  rotation: number | null;
  scale: number | null;
  createdAt: string;
}

export function Leaf({
  leaf,
  anchor,
  isNew = false,
  highlighted = false,
  onSelect,
}: {
  leaf: LeafData;
  anchor: { x: number; y: number; rotation: number; scale: number };
  isNew?: boolean;
  highlighted?: boolean;
  onSelect?: (leaf: LeafData) => void;
}) {
  const rotation = leaf.rotation ?? anchor.rotation;
  const scale = leaf.scale ?? anchor.scale;
  const styleSrc = `/leaves/leaf-${String((leaf.leafStyle % 20) + 1).padStart(2, "0")}.svg`;
  const [showFull, setShowFull] = useState(false);
  // When highlighted we always show the full @username for the magic reveal.
  const showUsername = highlighted || showFull;

  return (
    <motion.g
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: isNew ? 0.15 : 0 }}
      transform={`translate(${anchor.x} ${anchor.y}) rotate(${rotation}) scale(${scale})`}
      className={isNew ? "new-leaf" : highlighted ? "highlighted-leaf" : ""}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect?.(leaf)}
      onMouseEnter={() => setShowFull(true)}
      onMouseLeave={() => setShowFull(false)}
      onFocus={() => setShowFull(true)}
      onBlur={() => setShowFull(false)}
      tabIndex={0}
      role="button"
      aria-label={`Leaf for @${leaf.username}`}
    >
      {/* magic glow behind a highlighted leaf: golden radial halo + outline ring */}
      {highlighted && (
        <>
          <circle cx={0} cy={0} r={52} fill="rgba(255,200,0,0.30)" />
          <circle
            cx={0}
            cy={0}
            r={44}
            fill="none"
            stroke="#ffd11a"
            strokeWidth={3}
            strokeDasharray="6 6"
            opacity={0.95}
          />
          {/* sparkle sweep */}
          <motion.g
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 30, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "0px 0px" }}
          >
            <path
              d="M0 -58 L3 -44 L17 -47 L3 -34 L14 -22 L0 -30 L-14 -22 L-3 -34 L-17 -47 L-3 -44 Z"
              fill="#fff3a6"
              stroke="#ffcf2e"
              strokeWidth={0.8}
            />
          </motion.g>
        </>
      )}

      <image
        href={styleSrc}
        x={-42}
        y={-42}
        width={84}
        height={84}
        preserveAspectRatio="xMidYMid meet"
      />
      <text
        x={0}
        y={2}
        textAnchor="middle"
        dominantBaseline="middle"
        className={highlighted ? "leaf-label leaf-label-magic" : "leaf-label"}
        fontSize={showUsername ? 11 : 12}
      >
        {showUsername ? `@${leaf.username}` : leaf.displayUsername}
      </text>
    </motion.g>
  );
}
