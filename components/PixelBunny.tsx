"use client";

import React, { useEffect, useRef } from "react";
import { HOP_FRAMES, IDLE_FRAMES } from "@/lib/plant/pixelBunnyFrames";

export function PixelBunny() {
  const bunnyRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const stopFrames = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const playFrames = (frames: string[], fps: number) => {
    stopFrames();
    let i = 0;
    if (imgRef.current) imgRef.current.src = frames[0];
    frameTimerRef.current = setInterval(() => {
      i = (i + 1) % frames.length;
      if (imgRef.current) imgRef.current.src = frames[i];
    }, 1000 / fps);
  };

  useEffect(() => {
    const T = {
      travelIn: 3000,
      sit: 12000,
      travelOut: 5000,
      cycle: 20000,
    };

    let active = true;

    function runCycle(dir: "rl" | "lr") {
      if (!active || !bunnyRef.current) return;
      clearAllTimeouts();

      const bunny = bunnyRef.current;
      const enterX = dir === "rl" ? "120vw" : "-20vw";
      const centerX = "45vw";
      const exitX = dir === "rl" ? "-20vw" : "120vw";
      const facingLeft = dir === "rl";

      bunny.classList.remove("face-left");
      if (facingLeft) bunny.classList.add("face-left");
      bunny.style.transition = "none";
      bunny.style.transform = `translateX(${enterX})`;
      void bunny.offsetWidth;

      // Phase 1: Hop in
      playFrames(HOP_FRAMES, 10);
      bunny.style.transition = `transform ${T.travelIn / 1000}s linear`;
      requestAnimationFrame(() => {
        if (bunnyRef.current) {
          bunnyRef.current.style.transform = `translateX(${centerX})`;
        }
      });

      // Phase 2: Sit & idle-blink facing viewer
      const t1 = setTimeout(() => {
        if (!active || !bunnyRef.current) return;
        stopFrames();
        bunnyRef.current.classList.remove("face-left");
        playFrames(IDLE_FRAMES, 6);
      }, T.travelIn);

      // Phase 3: Hop onward and exit
      const t2 = setTimeout(() => {
        if (!active || !bunnyRef.current) return;
        if (facingLeft) bunnyRef.current.classList.add("face-left");
        playFrames(HOP_FRAMES, 10);
        bunnyRef.current.style.transition = `transform ${T.travelOut / 1000}s linear`;
        bunnyRef.current.style.transform = `translateX(${exitX})`;
      }, T.travelIn + T.sit);

      // Schedule next cycle with opposite direction
      const t3 = setTimeout(() => {
        if (!active) return;
        stopFrames();
        runCycle(dir === "rl" ? "lr" : "rl");
      }, T.cycle);

      timeoutsRef.current.push(t1, t2, t3);
    }

    runCycle("rl");

    return () => {
      active = false;
      stopFrames();
      clearAllTimeouts();
    };
  }, []);

  return (
    <div className="pixel-bunny" ref={bunnyRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} alt="Pixel Bunny" src={HOP_FRAMES[0]} />
    </div>
  );
}
