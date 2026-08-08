import { describe, it, expect } from "vitest";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from "../src/core/index.js";
import { ShimPlainDate } from "../src/temporal/shim.js";
import { getShimPlainDate } from "../src/temporal/detect.js";

// Node in this CI matrix (18/20/22/24) has no native `Temporal`, so
// `getPlainDate()` always resolves to `ShimPlainDate` here -- these tests
// exercise the shim directly and through the public `core` functions.
// `getShimPlainDate()` (asserted usable below) is the same override hook a
// future Node-26 parity test would use to force the shim path even when
// native Temporal is present, to prove the two agree.

describe("ShimPlainDate.add — calendar overflow ('constrain') rules", () => {
  it("clamps month-end overflow going forward: Jan 31 + 1 month -> Feb 28 (non-leap)", () => {
    const d = new ShimPlainDate(2023, 1, 31).add({ months: 1 });
    expect(d).toEqual({ year: 2023, month: 2, day: 28 });
  });

  it("clamps month-end overflow in a leap year: Jan 31 + 1 month -> Feb 29", () => {
    const d = new ShimPlainDate(2024, 1, 31).add({ months: 1 });
    expect(d).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it("rolls over the year: Dec 15 + 1 month -> Jan 15 next year", () => {
    const d = new ShimPlainDate(2023, 12, 15).add({ months: 1 });
    expect(d).toEqual({ year: 2024, month: 1, day: 15 });
  });

  it("adding 12 months equals adding 1 year", () => {
    const a = new ShimPlainDate(2023, 3, 10).add({ months: 12 });
    const b = new ShimPlainDate(2023, 3, 10).add({ years: 1 });
    expect(a).toEqual(b);
  });

  it("adds days across a month boundary", () => {
    const d = new ShimPlainDate(2024, 2, 28).add({ days: 1 });
    expect(d).toEqual({ year: 2024, month: 2, day: 29 }); // 2024 leap year -> 2/29 exists
    const d2 = new ShimPlainDate(2024, 2, 28).add({ days: 2 });
    expect(d2).toEqual({ year: 2024, month: 3, day: 1 });
  });

  it("subtracting is the inverse of adding", () => {
    const start = new ShimPlainDate(2024, 6, 15);
    const forward = start.add({ months: 5, days: 10 });
    const back = forward.subtract({ months: 5, days: 10 });
    expect(back).toEqual({ year: start.year, month: start.month, day: start.day });
  });

  it("negative amounts (going backward) also clamp: Mar 31 - 1 month -> Feb 28/29", () => {
    const d = new ShimPlainDate(2023, 3, 31).add({ months: -1 });
    expect(d).toEqual({ year: 2023, month: 2, day: 28 });
  });

  it("weeks compose with days", () => {
    const d = new ShimPlainDate(2024, 1, 1).add({ weeks: 2, days: 3 });
    // 2 weeks = 14 days, +3 = 17 days after Jan 1 -> Jan 18
    expect(d).toEqual({ year: 2024, month: 1, day: 18 });
  });

  it("getShimPlainDate() returns the same class as a direct import", () => {
    expect(getShimPlainDate()).toBe(ShimPlainDate);
  });

  it("equals() compares year/month/day", () => {
    const d = new ShimPlainDate(2024, 6, 15);
    expect(d.equals({ year: 2024, month: 6, day: 15 })).toBe(true);
    expect(d.equals({ year: 2024, month: 6, day: 16 })).toBe(false);
  });

  it("toDaysSinceEpoch()/fromDaysSinceEpoch() round-trip", () => {
    const d = new ShimPlainDate(2024, 6, 15);
    const days = d.toDaysSinceEpoch();
    expect(ShimPlainDate.fromDaysSinceEpoch(days)).toEqual(d);
  });

  it("static compare() orders two dates", () => {
    const early = { year: 2024, month: 1, day: 1 };
    const late = { year: 2024, month: 12, day: 31 };
    expect(ShimPlainDate.compare(early, late)).toBe(-1);
    expect(ShimPlainDate.compare(late, early)).toBe(1);
    expect(ShimPlainDate.compare(early, early)).toBe(0);
  });
});

describe("core arithmetic (Date in, Date out) — preserves time-of-day", () => {
  it("addDays preserves hours/minutes/seconds/ms", () => {
    const d = new Date(2024, 0, 15, 13, 45, 30, 123); // local time
    const result = addDays(d, 10);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(25);
    expect(result.getHours()).toBe(13);
    expect(result.getMinutes()).toBe(45);
    expect(result.getSeconds()).toBe(30);
    expect(result.getMilliseconds()).toBe(123);
  });

  it("addMonths clamps at month end", () => {
    const d = new Date(2023, 0, 31, 9, 0, 0); // Jan 31, 2023, local
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  it("addYears handles Feb 29 on a non-leap target year by clamping to Feb 28", () => {
    const d = new Date(2024, 1, 29, 0, 0, 0); // Feb 29, 2024 (leap)
    const result = addYears(d, 1);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28); // 2025 is not a leap year
  });

  it("addWeeks(date, 1) equals addDays(date, 7)", () => {
    const d = new Date(2024, 5, 1, 12, 0, 0);
    expect(addWeeks(d, 1).getTime()).toBe(addDays(d, 7).getTime());
  });

  it("subDays/subWeeks/subMonths/subYears are the mirror of their add* counterparts", () => {
    const d = new Date(2024, 5, 15, 8, 0, 0);
    expect(subDays(d, 5).getTime()).toBe(addDays(d, -5).getTime());
    expect(subWeeks(d, 2).getTime()).toBe(addWeeks(d, -2).getTime());
    expect(subMonths(d, 2).getTime()).toBe(addMonths(d, -2).getTime());
    expect(subYears(d, 3).getTime()).toBe(addYears(d, -3).getTime());
  });

  it("does not mutate the input Date", () => {
    const d = new Date(2024, 0, 1);
    const original = d.getTime();
    addDays(d, 100);
    expect(d.getTime()).toBe(original);
  });
});
