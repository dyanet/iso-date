import { describe, it, expect, afterEach } from "vitest";
import { getPlainDate, getShimPlainDate } from "../src/temporal/detect.js";
import { ShimPlainDate } from "../src/temporal/shim.js";

// Node 18/20/22/24 (this CI matrix) have no native `Temporal`, so
// `getPlainDate()` naturally exercises the shim path in every other test
// file. This file stubs `globalThis.Temporal` to prove the *other* branch
// of the detection logic -- picking up a native-shaped implementation when
// one is present -- actually works, without needing to run on Node 26.

describe("getPlainDate() feature detection", () => {
  afterEach(() => {
    delete (globalThis as { Temporal?: unknown }).Temporal;
  });

  it("falls back to the shim when globalThis.Temporal is absent", () => {
    expect((globalThis as { Temporal?: unknown }).Temporal).toBeUndefined();
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

    (globalThis as { Temporal?: unknown }).Temporal = { PlainDate: FakeNativePlainDate };

    const resolved = getPlainDate();
    expect(resolved).toBe(FakeNativePlainDate);
    expect(resolved).not.toBe(ShimPlainDate);
  });

  it("getShimPlainDate() always returns the shim, even when native Temporal is stubbed in", () => {
    (globalThis as { Temporal?: unknown }).Temporal = { PlainDate: class {} };
    expect(getShimPlainDate()).toBe(ShimPlainDate);
  });
});
