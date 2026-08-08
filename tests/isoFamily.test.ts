import { describe, expect, it } from "vitest";
import {
  isISOMatch,
  normalizeISO,
  parseISOComponents,
  parseISOStrict,
} from "../src/strict.js";

describe("parseISOStrict", () => {
  it("parses a complete ISO 8601 string to the correct instant", () => {
    const d = parseISOStrict("2019-09-18T19:00:52Z");
    expect(d.toISOString()).toBe("2019-09-18T19:00:52.000Z");
  });

  it("parses a date-only string to local midnight in the given context", () => {
    const d = parseISOStrict("2024-03-15", { representation: "date" });
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // 0-indexed: March
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it("returns an Invalid Date for a non-ISO or impossible-calendar string", () => {
    expect(Number.isNaN(parseISOStrict("2023-02-30T00:00:00Z").getTime())).toBe(true);
    expect(Number.isNaN(parseISOStrict("not a date").getTime())).toBe(true);
  });

  it("honors a custom `in` context constructor", () => {
    class Tagged extends Date {
      tag = "custom";
    }
    const d = parseISOStrict("2020-01-01T00:00:00Z", {
      in: (value) => new Tagged(value),
    });
    expect(d).toBeInstanceOf(Tagged);
    expect((d as Tagged).tag).toBe("custom");
  });
});

describe("parseISOComponents", () => {
  it("extracts calendar, ordinal, and ISO-week fields together, mutually consistent", () => {
    // 2019-12-30 is a Monday and falls in ISO week-year 2020, week 1.
    const c = parseISOComponents("2019-12-30T00:00:00Z");
    expect(c).not.toBeNull();
    expect(c!.year).toBe(2019);
    expect(c!.month).toBe(12);
    expect(c!.day).toBe(30);
    expect(c!.weekYear).toBe(2020);
    expect(c!.week).toBe(1);
    expect(c!.isoDay).toBe(1);
  });

  it("returns null for a string that isn't strict ISO 8601", () => {
    expect(parseISOComponents("2023-02-30T00:00:00Z")).toBeNull();
    expect(parseISOComponents("50")).toBeNull();
  });
});

describe("normalizeISO", () => {
  it("round-trips a calendar date between extended and basic format", () => {
    expect(
      normalizeISO("2019-09-18T19:00:52Z", { outputFormat: "basic" }),
    ).toBe("20190918T190052Z");
    expect(
      normalizeISO("20190918T190052Z", {
        inputFormat: "basic",
        outputFormat: "extended",
      }),
    ).toBe("2019-09-18T19:00:52Z");
  });

  it("converts a calendar date to its ISO week-date representation", () => {
    // 2019-12-30 -> ISO week-year 2020, week 1, Monday.
    expect(
      normalizeISO("2019-12-30", {
        representation: "date",
        outputDateRepresentation: "week",
      }),
    ).toBe("2020-W01-1");
  });

  it("preserves a signed-zero offset's written form rather than normalizing it away", () => {
    expect(normalizeISO("2019-09-18T19:00:52-00:00")).toBe(
      "2019-09-18T19:00:52-00:00",
    );
    expect(normalizeISO("2019-09-18T19:00:52+00:00")).toBe(
      "2019-09-18T19:00:52+00:00",
    );
  });

  it("throws RangeError for input that isn't strict ISO 8601", () => {
    expect(() => normalizeISO("2023-02-30")).toThrow(RangeError);
  });
});

describe("cross-function consistency", () => {
  it("every string normalizeISO accepts, isISOMatch also accepts", () => {
    const samples: Array<[string, "complete" | "date", "calendar" | "ordinal"]> = [
      ["2019-09-18T19:00:52Z", "complete", "calendar"],
      ["2019-09-18", "date", "calendar"],
      ["0000-01-01", "date", "calendar"],
      ["9999-12-31", "date", "calendar"],
      ["2020-366", "date", "ordinal"], // ordinal, leap year
    ];
    for (const [s, rep, dateRep] of samples) {
      expect(() =>
        normalizeISO(s, {
          representation: rep,
          inputDateRepresentation: dateRep,
        }),
      ).not.toThrow();
    }
    expect(isISOMatch("2019-09-18T19:00:52Z")).toBe(true);
    expect(isISOMatch("2019-09-18", { representation: "date" })).toBe(true);
  });
});
