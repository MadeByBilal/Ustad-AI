"use client";
import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

interface MicVisualizerProps {
  level: MotionValue<number>;
  active: boolean;
  ringCount?: number;
}

export default function MicVisualizer({ level, active, ringCount = 6 }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const ringsRef = useRef<number[]>(new Array(ringCount).fill(0));
  const activeRef = useRef(active);

  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cap DPR at 2 — on 3x phones the 280px canvas would rasterize at 840×840
    // for no visible gain on soft arcs.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 56;

    // Color palettes
    const greenPalette = [
      { h: 142, s: 80, l: 55 }, // green
      { h: 148, s: 78, l: 52 }, // mid green
      { h: 154, s: 75, l: 50 }, // teal-green
      { h: 142, s: 80, l: 48 }, // deep green
      { h: 148, s: 78, l: 45 }, // darker green
      { h: 154, s: 75, l: 43 }, // dark teal-green
    ];
    const goldPalette = [
      { h: 28, s: 85, l: 60 },  // orange
      { h: 32, s: 82, l: 58 },  // warm orange
      { h: 36, s: 80, l: 56 },  // amber
      { h: 40, s: 78, l: 54 },  // gold-amber
      { h: 44, s: 75, l: 52 },  // gold
      { h: 48, s: 72, l: 50 },  // deep gold
    ];

    const start = performance.now();
    let frame = 0;

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      frame += 1;

      const isActive = activeRef.current;

      // Idle breathing doesn't need 60fps — skipping every other frame halves
      // the drawing work with no visible difference on the slow pulse.
      if (!isActive && frame % 2 === 1) return;

      ctx.clearRect(0, 0, size, size);

      const rings = ringsRef.current;
      const count = rings.length;
      const levelValue = level.get();
      const t = (performance.now() - start) / 1000;

      for (let i = 0; i < count; i++) {
        // Ring physics
        if (isActive) {
          const target = levelValue * (1 - i * 0.08) * (0.6 + Math.sin(t * 2 + i * 0.8) * 0.4);
          rings[i] += (target - rings[i]) * 0.2;
        } else {
          // Idle breathing: gentle sine pulse per ring
          const breathe = Math.sin(t * 0.5 + i * 1.2) * 0.08;
          rings[i] += (breathe - rings[i]) * 0.05;
        }

        const palette = isActive ? goldPalette : greenPalette;
        const color = palette[i % palette.length];
        const r = baseRadius + i * 9 + rings[i] * 14;

        // Arc properties vary per ring
        const speed = isActive ? 0.4 + i * 0.15 : 0.08 + i * 0.03;
        const rotation = t * speed * (i % 2 === 0 ? 1 : -1); // alternate directions
        const arcLength = Math.PI * (1.2 + rings[i] * 0.8 + Math.sin(t * 0.7 + i) * 0.2);
        const startAngle = rotation + (i * Math.PI) / count;

        // Alpha: brighter when active, subtle breathing when idle
        const idleAlpha = 0.08 + Math.sin(t * 0.6 + i * 0.9) * 0.04;
        const activeAlpha = 0.25 + rings[i] * 0.7;
        const alpha = isActive ? activeAlpha : idleAlpha;

        // Glow pass: a wide, faint stroke with additive blending. This replaces
        // ctx.filter = "blur(4px)", which forced an offscreen re-rasterization
        // of the layer on every frame — the main cause of the mobile stutter.
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLength);
        ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * 0.28})`;
        ctx.lineWidth = 9 - i * 0.5;
        ctx.stroke();

        // Sharp ring on top
        ctx.globalCompositeOperation = "source-over";
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLength);
        ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;
        ctx.lineWidth = 2 - i * 0.12;
        ctx.stroke();
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [ringCount, level]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: 280, height: 280, imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
