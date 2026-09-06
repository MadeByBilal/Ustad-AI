"use client";
import { useEffect, useRef } from "react";

interface MicVisualizerProps {
  micLevel: number;
  active: boolean;
  ringCount?: number;
}

export default function MicVisualizer({ micLevel, active, ringCount = 3 }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const ringsRef = useRef<number[]>(new Array(ringCount).fill(0));
  const micLevelRef = useRef(micLevel);
  const activeRef = useRef(active);
  const rotationRef = useRef(0);

  micLevelRef.current = micLevel;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = 52;

    const tick = () => {
      ctx.clearRect(0, 0, size, size);

      const rings = ringsRef.current;
      const count = rings.length;
      const level = micLevelRef.current;
      const isActive = activeRef.current;

      rotationRef.current += 0.003;

      for (let i = 0; i < count; i++) {
        if (isActive) {
          const delay = i * 0.12;
          const target = level * (1 - i * 0.1) * (0.6 + Math.sin(Date.now() * 0.002 + i) * 0.4);
          rings[i] += (target - rings[i]) * 0.25;
        } else {
          rings[i] *= 0.92;
        }

        const r = baseRadius + i * 10 + rings[i] * 12;
        const alpha = Math.max(0.05, (0.7 - i * 0.08) * (isActive ? 0.3 + rings[i] * 0.7 : 0.15));
        const hue = 28 + i * 8 + rings[i] * 20;

        ctx.beginPath();
        const startAngle = rotationRef.current + (i * Math.PI) / count;
        const arcLength = Math.PI * 1.4 + rings[i] * Math.PI * 0.6;
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLength);
        ctx.strokeStyle = `hsla(${hue}, 85%, 60%, ${alpha})`;
        ctx.lineWidth = 2.5 - i * 0.2;
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
      style={{ width: 200, height: 200, imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
