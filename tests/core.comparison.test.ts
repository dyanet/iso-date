import { describe, it, expect } from "vitest";
import {
  isBefore,
  isAfter,
  isEqual,
  compareAsc,
  compareDesc,
  isSameDay,
  isSameMonth,
  isSameYear,
  differenceInCalendarDays,
} from "../src/core/index.js";
import { isValid } from "../src/core/validity.js";

describe("comparison", () => {
  const a = new Date(2024, 5, 15, 10, 0, 0);
  const b = new Date(2024, 5, 20, 8, 0, 0);

  it("isBefore / isAfter / isEqual", () => {
    expect(isBefore(a, b)).toBe(true);
    expect(isAfter(b, a)).toBe(true);
    expect(isEqual(a, a)).toBe(true);
    expect(isEqual(a, b)).toBe(false);
  });

  it("compareAsc / compareDesc", () => {
    expect(compareAsc(a, b)).toBe(-1);
    expect(compareAsc(b, a)).toBe(1);
    expect(compareAsc(a, a)).toBe(0);
    expect(compareDesc(a, b)).toBe(1);
    expect(compareDesc(b, a)).toBe(-1);
    expect(compareDesc(a, a)).toBe(0);
  });

  it("isSameDay ignores time-of-day", () => {
    const morning = new Date(2024, 5, 15, 1, 0, 0);
    const night = new Date(2024, 5, 15, 23, 59, 59);
    expect(isSameDay(morning, night)).toBe(true);
    expect(isSameDay(morning, b)).toBe(false);
  });

  it("isSameMonth / isSameYear", () => {
    expect(isSameMonth(a, b)).toBe(true);
    expect(isSameMonth(a, new Date(2024, 6, 15))).toBe(false);
    expect(isSameYear(a, b)).toBe(true);
    expect(isSameYear(a, new Date(2025, 5, 15))).toBe(false);
  });
});

describe("differenceInCalendarDays", () => {
  it("counts whole calendar days, ignoring time-of-day", () => {
    const start = new Date(2024, 0, 1, 23, 59, 59);
    const end = new Date(2024, 0, 2, 0, 0, 1);
    // Only ~1 second apart in real time, but crosses a calendar-day boundary.
    expect(differenceInCalendarDays(end, start)).toBe(1);
  });

  it("is negative when the second date is later", () => {
    expect(
      differenceInCalendarDays(new Date(2024, 0, 1), new Date(2024, 0, 10)),
    ).toBe(-9);
  });

  it("crosses a leap-year February correctly", () => {
    expect(
      differenceInCalendarDays(new Date(2024, 2, 1), new Date(2024, 1, 1)),
    ).toBe(29); // Feb 2024 has 29 days
  });

  it("is zero for the same calendar day", () => {
    expect(
      differenceInCalendarDays(new Date(2024, 5, 1, 3, 0), new Date(2024, 5, 1, 20, 0)),
    ).toBe(0);
  });
});

describe("isValid", () => {
  it("true for a real Date", () => {
    expect(isValid(new Date())).toBe(true);
  });

  it("false for an Invalid Date", () => {
    expect(isValid(new Date(NaN))).toBe(false);
  });
});
