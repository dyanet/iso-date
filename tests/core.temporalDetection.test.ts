import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPlainDate, getShimPlainDate } from "../src/temporal/detect.js";
import { ShimPlainDate } from "../src/temporal/shim.js";

// Whether `globalThis.Temporal` exists depends on which Node line is running
// this file: 26 ships it natively, 22 doesn't. So neither branch of the
// detection logic can be reached by *assuming* what `globalThis` looks like
// -- an earlier version of this file asserted `Temporal` was undefined, which
// held on Node 22 and failed outright on Node 26. Each test below instead
// puts `globalThis.Temporal` into the state it wants and restores the real
// descriptor afterwards, so both branches get exercised on every Node version
// in the matrix, native `Temporal` or not.

type TemporalGlobal = { Temporal?: unknown };

const globalWithTemporal = globalThis as TemporalGlobal;

// Sampled at module load, before any hook below has had a chance to swap the
// global out from under it.
const hasNativeTemporal =
  typeof globalWithTemporal.Temporal === "object" && globalWithTemporal.Temporal !== null;

describe("getPlainDate() feature detection", () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Temporal");
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "Temporal", originalDescriptor);
    } else {
      delete globalWithTemporal.Temporal;
    }
  });

  it("falls back to the shim when globalThis.Temporal is absent", () => {
    delete globalWithTemporal.Temporal;

    expect(globalWithTemporal.Temporal).toBeUndefined();
    expect(getPlainDate()).toBe(ShimPlainDate);
  });

  it("prefers a native-shaped Temporal.PlainDate when present on globalThis", () => {
    class FakeNativePlainDate {
      constructor(
        public year: number,
        public month: number,
        public day: number,
      ) {}
      static from(input: { year: number; month: number; day: number }) {
        return new FakeNativePlainDate(input.year, input.month, input.day);
      }
      static compare(
        a: { year: number; month: number; day: number },
        b: { year: number; month: number; day: number },
      ) {
        return a.year - b.year || a.month - b.month || a.day - b.day;
      }
      add() {
        return this;
      }
      subtract() {
        return this;
      }
      equals(other: { year: number; month: number; day: number }) {
        return this.year === other.year && this.month === other.month && this.day === other.day;
      }
    }

    globalWithTemporal.Temporal = { PlainDate: FakeNativePlainDate };

    const resolved = getPlainDate();
    expect(resolved).toBe(FakeNativePlainDate);
    expect(resolved).not.toBe(ShimPlainDate);
  });

  it("getShimPlainDate() always returns the shim, even when native Temporal is stubbed in", () => {
    globalWithTemporal.Temporal = { PlainDate: class {} };
    expect(getShimPlainDate()).toBe(ShimPlainDate);
  });

  // The stub above proves the *branch* works; this proves the branch picks up
  // a real engine-provided `Temporal.PlainDate` when there is one. Runs only
  // on Node lines that actually ship it (26+), which is what that entry in
  // the CI matrix is there to cover -- faking it here would test nothing the
  // stub case doesn't already.
  it.runIf(hasNativeTemporal)(
    "resolves to the engine's own Temporal.PlainDate on a native-Temporal runtime",
    () => {
      const native = (globalWithTemporal.Temporal as { PlainDate: unknown }).PlainDate;

      expect(getPlainDate()).toBe(native);
      expect(getPlainDate()).not.toBe(ShimPlainDate);
    },
  );
});
