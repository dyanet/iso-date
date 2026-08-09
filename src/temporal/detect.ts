/**
 * Feature-detection layer: resolves to native `Temporal.PlainDate` when the
 * running engine has it, otherwise the dependency-free {@link ShimPlainDate}.
 * `core`'s functions call {@link getPlainDate} once and use whichever comes
 * back identically either way -- they never branch on which is active.
 */

import { ShimPlainDate, type DurationLike, type PlainDateLike } from "./shim.js";

/** The minimal PlainDate surface `core` functions rely on -- satisfied by
 * both the real `Temporal.PlainDate` (when present on `globalThis`) and by
 * {@link ShimPlainDate}. */
export interface PlainDateEngine {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  add(duration: DurationLike): PlainDateEngine;
  subtract(duration: DurationLike): PlainDateEngine;
  equals(other: PlainDateLike): boolean;
}

export interface PlainDateConstructor {
  from(input: PlainDateLike): PlainDateEngine;
  compare(a: PlainDateLike, b: PlainDateLike): number;
}

function nativeTemporalPlainDate(): PlainDateConstructor | null {
  const g = globalThis as { Temporal?: { PlainDate?: unknown } };
  if (typeof g.Temporal === "object" && g.Temporal !== null && g.Temporal.PlainDate) {
    return g.Temporal.PlainDate as unknown as PlainDateConstructor;
  }
  return null;
}

/**
 * Returns the active `PlainDate` implementation: native `Temporal.PlainDate`
 * when the running engine has it (Node >= 26, released May 2026, and modern
 * browsers -- Firefox 139+, Chrome 144+), otherwise {@link ShimPlainDate}.
 */
export function getPlainDate(): PlainDateConstructor {
  return nativeTemporalPlainDate() ?? ShimPlainDate;
}

/**
 * Always the shim, regardless of what's on `globalThis`. Exported so tests
 * can reach the shim even when native `Temporal` is present (or stubbed) in
 * the same run -- see `tests/core.temporalDetection.test.ts`.
 */
export function getShimPlainDate(): PlainDateConstructor {
  return ShimPlainDate;
}
