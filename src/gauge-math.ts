/**
 * Pure helpers (no DOM, no Lit): easy to unit test and to reason about.
 */

export type GaugeStatus = 'normal' | 'warning' | 'critical';

/** Arc of the gauge, in degrees: 270° leaves a gap at the bottom for the label. */
export const SWEEP = 270;
/** The arc starts at the bottom left (135° clockwise from 3 o'clock). */
export const START_ANGLE = 135;

/** A threshold counts only if it is a finite number (attributes removed give null). */
export const isSet = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Normalizes the range: a reversed range is swapped, an empty one stays empty. */
export function range(min: number, max: number): { lo: number; hi: number } {
  const a = isSet(min) ? min : 0;
  const b = isSet(max) ? max : 100;
  return a <= b ? { lo: a, hi: b } : { lo: b, hi: a };
}

/** Value kept inside the range (what the arc and aria-valuenow show). */
export function clamp(value: number, min: number, max: number): number {
  const { lo, hi } = range(min, max);
  if (!isSet(value)) return lo;
  return Math.min(hi, Math.max(lo, value));
}

/** Position of the value along the arc, from 0 to 1. */
export function fraction(value: number, min: number, max: number): number {
  const { lo, hi } = range(min, max);
  if (hi === lo) return 0;
  return (clamp(value, lo, hi) - lo) / (hi - lo);
}

/**
 * Status from the thresholds.
 * - Higher is worse (default): value >= critical → critical, value >= warning → warning.
 * - Lower is worse (battery, fuel…): when both are set and critical < warning,
 *   value <= critical → critical, value <= warning → warning.
 */
export function statusOf(value: number, warning?: number | null, critical?: number | null): GaugeStatus {
  if (!isSet(value)) return 'normal';
  const lowerIsWorse = isSet(warning) && isSet(critical) && critical < warning;
  if (lowerIsWorse) {
    if (value <= critical) return 'critical';
    if (value <= warning) return 'warning';
    return 'normal';
  }
  if (isSet(critical) && value >= critical) return 'critical';
  if (isSet(warning) && value >= warning) return 'warning';
  return 'normal';
}

/** Point on a circle centred at (50, 50), for an angle in degrees (clockwise from 3 o'clock). */
export function pointAt(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(rad), y: 50 + radius * Math.sin(rad) };
}
