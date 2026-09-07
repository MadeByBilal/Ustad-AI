"use client";
import { useEffect, useRef } from "react";

interface MicVisualizerProps {
  micLevel: number;
  active: boolean;
  ringCount?: number;
}

export default function MicVisualizer({ micLevel, active, ringCount = 6 }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const ringsRef = useRef<number[]>(new Array(ringCount).fill(0));
  const micLevelRef = useRef(micLevel);
  const activeRef = useRef(active);
  const timeRef = useRef(0);

  micLevelRef.current = micLevel;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 56;

    // Color palette: green → teal → blue for depth
    const palette = [
      { h: 142, s: 80, l: 55 }, // green
      { h: 160, s: 75, l: 50 }, // teal-green
      { h: 175, s: 70, l: 48 }, // teal
      { h: 190, s: 65, l: 45 }, // cyan-teal
      { h: 205, s: 60, l: 42 }, // blue-cyan
      { h: 220, s: 55, l: 40 }, // blue
    ];

    const tick = () => {
      ctx.clearRect(0, 0, size, size);
      timeRef.current += 0.016; // ~60fps

      const rings = ringsRef.current;
      const count = rings.length;
      const level = micLevelRef.current;
      const isActive = activeRef.current;
      const t = timeRef.current;

      for (let i = 0; i < count; i++) {
        // Ring physics
        if (isActive) {
          const target = level * (1 - i * 0.08) * (0.6 + Math.sin(t * 2 + i * 0.8) * 0.4);
          rings[i] += (target - rings[i]) * 0.2;
        } else {
          // Idle breathing: gentle sine pulse per ring
          const breathe = Math.sin(t * 0.5 + i * 1.2) * 0.08;
          rings[i] += (breathe - rings[i]) * 0.05;
        }

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

        // Glow effect (draw ring twice: blurred then sharp)
        const glowAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLength);
        ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${glowAlpha})`;
        ctx.lineWidth = 6 - i * 0.4;
        ctx.lineCap = "round";
        ctx.filter = "blur(4px)";
        ctx.stroke();
        ctx.filter = "none";

        // Sharp ring on top
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLength);
        ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;
        ctx.lineWidth = 2 - i * 0.12;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [ringCount]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: 280, height: 280, imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
