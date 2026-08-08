import { describe, it, expect } from "vitest";
import { daysFromCivil, civilFromDays, isLeapYear } from "../src/strictISO.js";

describe("civilFromDays (inverse of daysFromCivil)", () => {
  it("round-trips a wide range of years, including negative (pre-epoch) years", () => {
    const samples: Array<[number, number, number]> = [];
    for (let year = -2000; year <= 4000; year += 37) {
      for (const [month, day] of [
        [1, 1],
        [2, 1],
        [2, 28],
        [3, 1],
        [6, 15],
        [12, 31],
        [4, 30],
      ] as const) {
        samples.push([year, month, day]);
      }
      if (isLeapYear(year)) samples.push([year, 2, 29]);
    }

    for (const [year, month, day] of samples) {
      const days = daysFromCivil(year, month, day);
      const back = civilFromDays(days);
      expect(back).toEqual({ year, month, day });
    }
  });

  it("matches the real ECMAScript Date for the range Date can represent", () => {
    for (let d = -100000; d <= 100000; d += 613) {
      const jsDate = new Date(d * 86400000);
      const expected = {
        year: jsDate.getUTCFullYear(),
        month: jsDate.getUTCMonth() + 1,
        day: jsDate.getUTCDate(),
      };
      expect(civilFromDays(d)).toEqual(expected);
    }
  });

  it("handles the epoch and its immediate neighbors", () => {
    expect(civilFromDays(0)).toEqual({ year: 1970, month: 1, day: 1 });
    expect(civilFromDays(-1)).toEqual({ year: 1969, month: 12, day: 31 });
    expect(civilFromDays(1)).toEqual({ year: 1970, month: 1, day: 2 });
  });

  it("handles a leap-year Feb 29 and the day before/after", () => {
    const feb29 = daysFromCivil(2024, 2, 29);
    expect(civilFromDays(feb29 - 1)).toEqual({ year: 2024, month: 2, day: 28 });
    expect(civilFromDays(feb29)).toEqual({ year: 2024, month: 2, day: 29 });
    expect(civilFromDays(feb29 + 1)).toEqual({ year: 2024, month: 3, day: 1 });
  });

  it("handles a year boundary", () => {
    const dec31 = daysFromCivil(2023, 12, 31);
    expect(civilFromDays(dec31 + 1)).toEqual({ year: 2024, month: 1, day: 1 });
  });
});
