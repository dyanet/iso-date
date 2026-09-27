import { describe, expect, it } from "vitest";
import {
  civilFromDays,
  computeTimestamp,
  daysFromCivil,
  formatYear,
  isoDayOfWeek,
  parseDatePart,
  parseStrictISO,
  parseTimePart,
  parseYear,
  weeksInISOYear,
} from "../src/strictISO";

// Oracle: ECMAScript Date in UTC, used only where it is valid (years 1..9999).
function utcDays(y: number, m: number, d: number): number {
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(0, 0, 0, 0);
  return Math.round(date.getTime() / 86400000);
}

describe("calendar math agrees with Date across eras", () => {
  const samples: Array<[number, number, number]> = [
    [1, 1, 1], [1600, 2, 29], [1899, 12, 31], [1900, 3, 1],
    [1969, 12, 31], [1970, 1, 1], [2000, 2, 29], [2024, 12, 31],
    [2100, 3, 1], [9999, 12, 31],
  ];

  it.each(samples)("daysFromCivil(%i-%i-%i) matches Date", (y, m, d) => {
    expect(daysFromCivil(y, m, d)).toBe(utcDays(y, m, d));
  });

  it.each(samples)("civilFromDays round-trips %i-%i-%i", (y, m, d) => {
    expect(civilFromDays(daysFromCivil(y, m, d))).toEqual({ year: y, month: m, day: d });
  });

  it("round-trips negative (BCE) years without the off-by-one bias bug", () => {
    for (const days of [-719468, -719469, -800000, -1_000_000, -146097 * 3 - 1]) {
      const c = civilFromDays(days);
      expect(daysFromCivil(c.year, c.month, c.day)).toBe(days);
    }
  });

  it("isoDayOfWeek matches Date#getUTCDay", () => {
    for (const [y, m, d] of samples) {
      const dow = new Date(utcDays(y, m, d) * 86400000).getUTCDay() || 7;
      expect(isoDayOfWeek(y, m, d)).toBe(dow);
    }
  });

  it("weeksInISOYear: 53-week years (Thu Jan 1, or leap + Wed Jan 1)", () => {
    expect(weeksInISOYear(2015)).toBe(53); // Jan 1 Thursday
    expect(weeksInISOYear(2020)).toBe(53); // leap, Jan 1 Wednesday
    expect(weeksInISOYear(2019)).toBe(52);
    expect(weeksInISOYear(2021)).toBe(52);
  });
});

describe("year grammar", () => {
  it("parses signed expanded years at each width", () => {
    expect(parseYear("+002024-01-01", 2)).toEqual({ year: 2024, rest: "-01-01" });
    expect(parseYear("-0001", 0)).toEqual({ year: -1, rest: "" });
    expect(parseYear("+12345", 1)).toEqual({ year: 12345, rest: "" });
  });

  it("rejects short, non-digit, or missing years", () => {
    expect(parseYear("+0024", 2)).toBeNull();
    expect(parseYear("-00a0", 0)).toBeNull();
    expect(parseYear("202", 0)).toBeNull();
    expect(parseYear("", 0)).toBeNull();
  });

  it("formats years inside and outside 0..9999", () => {
    expect(formatYear(0, 0)).toBe("0000");
    expect(formatYear(10000, 2)).toBe("+010000");
    expect(formatYear(-1, 0)).toBe("-0001");
    expect(() => formatYear(10000, 0)).toThrow(RangeError);
    expect(() => formatYear(-1_000_000, 2)).toThrow(/out of range/);
  });
});

describe("week dates crossing year boundaries", () => {
  it("2020-W01-1 is Monday 2019-12-30 (week 1 starts in the prior year)", () => {
    const p = parseDatePart("2020-W01-1", "extended", "week", 0)!;
    expect([p.year, p.month, p.day]).toEqual([2019, 12, 30]);
    expect([p.weekYear, p.week, p.isoDay]).toEqual([2020, 1, 1]);
  });

  it("2020-W53-5 is Friday 2021-01-01 (week 53 spills into next year)", () => {
    const p = parseDatePart("2020W535", "basic", "week", 0)!;
    expect([p.year, p.month, p.day]).toEqual([2021, 1, 1]);
    expect([p.weekYear, p.week, p.isoDay]).toEqual([2020, 53, 5]);
  });

  it("calendar dates report the ISO week-year when it differs", () => {
    const early = parseDatePart("2021-01-01", "extended", "calendar", 0)!;
    expect([early.weekYear, early.week]).toEqual([2020, 53]);
    const late = parseDatePart("2024-12-30", "extended", "calendar", 0)!;
    expect([late.weekYear, late.week]).toEqual([2025, 1]);
  });

  it("rejects week 53 in a 52-week year, week 0, and day 0/8", () => {
    expect(parseDatePart("2021-W53-1", "extended", "week", 0)).toBeNull();
    expect(parseDatePart("2021-W00-1", "extended", "week", 0)).toBeNull();
    expect(parseDatePart("2021-W10-0", "extended", "week", 0)).toBeNull();
    expect(parseDatePart("2021-W10-8", "extended", "week", 0)).toBeNull();
  });
});

describe("ordinal dates", () => {
  it("day 366 exists only in leap years", () => {
    const p = parseDatePart("2024366", "basic", "ordinal", 0)!;
    expect([p.month, p.day, p.dayOfYear]).toEqual([12, 31, 366]);
    expect(parseDatePart("2023-366", "extended", "ordinal", 0)).toBeNull();
    expect(parseDatePart("2023-000", "extended", "ordinal", 0)).toBeNull();
  });

  it("rejects mismatched separators for the chosen format", () => {
    expect(parseDatePart("2024-060", "basic", "ordinal", 0)).toBeNull();
    expect(parseDatePart("2024060", "extended", "ordinal", 0)).toBeNull();
  });
});

describe("time part", () => {
  it("parses basic offsets with sign", () => {
    expect(parseTimePart("235959-0530", "basic")).toMatchObject({
      hours: 23, minutes: 59, seconds: 59, offsetMinutes: -330, offsetRaw: "-0530",
    });
  });

  it("rejects out-of-range fields and offsets", () => {
    expect(parseTimePart("24:00:00Z", "extended")).toBeNull();
    expect(parseTimePart("12:60:00Z", "extended")).toBeNull();
    expect(parseTimePart("12:00:60Z", "extended")).toBeNull();
    expect(parseTimePart("12:00:00+24:00", "extended")).toBeNull();
    expect(parseTimePart("12:00:00+01:60", "extended")).toBeNull();
    expect(parseTimePart("120000+01:00", "basic")).toBeNull();
  });
});

describe("parseStrictISO + computeTimestamp", () => {
  it("matches Date.parse for offset timestamps", () => {
    for (const s of ["2024-02-29T12:34:56+05:30", "1999-12-31T23:59:59-08:00", "1970-01-01T00:00:00Z"]) {
      const r = parseStrictISO(s, {})!;
      expect(computeTimestamp(r.datePart!, r.timePart)).toBe(Date.parse(s));
    }
  });

  it("date-only timestamps are UTC midnight", () => {
    const r = parseStrictISO("2024-03-10", { representation: "date" })!;
    expect(r.timePart).toBeNull();
    expect(computeTimestamp(r.datePart!, null)).toBe(Date.UTC(2024, 2, 10));
  });

  it("rejects a missing T, a lowercase t, and a bad date or time half", () => {
    expect(parseStrictISO("2024-03-10 12:00:00Z", {})).toBeNull();
    expect(parseStrictISO("2024-03-10t12:00:00Z", {})).toBeNull();
    expect(parseStrictISO("2024-02-30T12:00:00Z", {})).toBeNull();
    expect(parseStrictISO("2024-02-28T25:00:00Z", {})).toBeNull();
    expect(parseStrictISO("25:00:00Z", { representation: "time" })).toBeNull();
    expect(parseStrictISO("2024-13-01", { representation: "date" })).toBeNull();
  });
});
