import type { Point3D } from "./types.js";

export function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp(amount);
}

export function distance(a: Point3D | undefined, b: Point3D | undefined): number {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function median(values: number[]): number {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) return 0;

  const middle = Math.floor(finite.length / 2);
  const upper = finite[middle] ?? 0;
  if (finite.length % 2 === 1) return upper;

  const lower = finite[middle - 1] ?? upper;
  return (lower + upper) / 2;
}

export function normalizeBetween(value: number, a: number, b: number): number {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const width = max - min;
  if (width <= Number.EPSILON) return 0.5;
  return clamp((value - min) / width);
}

export function confidenceAbove(value: number, threshold: number, spread: number): number {
  if (spread <= 0) return value >= threshold ? 1 : 0;
  return clamp((value - threshold + spread) / (spread * 2));
}

export function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
