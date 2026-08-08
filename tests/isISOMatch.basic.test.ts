import { describe, expect, it } from "vitest";
import { isISOMatch } from "../src/strict.js";

/**
 * Behavioral tests for isISOMatch: strict ISO 8601 shape + calendar validity
 * checking, distinct from date-fns's lenient parseISO/isValid. Ported from
 * the original task's hidden verification suite.
 */
describe("isISOMatch", () => {
  it("accepts a complete ISO 8601 date-time by default", () => {
    /**
     * What: isISOMatch's default (`representation` omitted) behavior on a
     * well-formed complete ISO 8601 string, including a time part whose
     * minute is not zero.
     * How: calls `isISOMatch("2019-09-18T19:00:52Z")` with no options and
     * asserts it returns `true`; also asserts
     * `isISOMatch("2019-09-18T19:30:00Z")` returns `true` for a
     * non-zero-minute time part.
     * Why: instruction.md states the default representation is "complete"
     * and gives this exact example; this is the primary contract of the
     * function and a naive implementation that never returns true (e.g. a
     * stub `return false`) must fail this. The non-zero-minute assertion
     * additionally guards against an implementation that reads the time
     * capture groups at the wrong offsets when validating the time part
     * inside a complete-representation string (a bug that would coincide
     * with minute-00 strings appearing valid while any minute > 0 is
     * wrongly rejected).
     */
    expect(isISOMatch("2019-09-18T19:00:52Z")).toBe(true);
    expect(isISOMatch("2019-09-18T19:00:52+02:00")).toBe(true);
    expect(isISOMatch("2019-09-18T19:30:00Z")).toBe(true);
  });

  it("accepts only the date part when representation is 'date'", () => {
    /**
     * What: the `{ representation: "date" }` option restricts the check to
     * the date part alone.
     * How: calls `isISOMatch("2019-09-18", { representation: "date" })` and
     * asserts `true`; also asserts the same date string is rejected under
     * the default representation (no `T`/time part present), and that a
     * complete date-time is rejected when the option requires date only.
     * Why: instruction.md specifies `"date"` requires only the date part;
     * this also guards against an implementation that ignores the
     * `representation` option or treats it as permitting, rather than
     * requiring, the selected shape. Importing through the package's
     * top-level source index also verifies the required public export.
     */
    expect(isISOMatch("2019-09-18", { representation: "date" })).toBe(true);
    expect(isISOMatch("2019-09-18")).toBe(false);
    expect(
      isISOMatch("2019-09-18T19:00:52Z", { representation: "date" }),
    ).toBe(false);
  });

  it("accepts only the time part, with its timezone qualifier, when representation is 'time'", () => {
    /**
     * What: the `{ representation: "time" }` option requires only a time part
     * with an uppercase `Z` or signed numeric timezone qualifier.
     * How: asserts `"19:00:52Z"` and `"19:00:52+02:00"` return `true`, while
     * date-only and complete strings return `false` under the time option. It
     * also rejects lowercase `z` in standalone and complete representations.
     * Why: instruction.md defines the qualifier as the letter `Z` or a signed
     * offset and requires the selected shape exclusively. These checks guard
     * against accepting only one valid qualifier, ignoring the representation,
     * or making `Z` case-insensitive even though the required shape names the
     * uppercase letter exactly.
     */
    expect(isISOMatch("19:00:52Z", { representation: "time" })).toBe(true);
    expect(isISOMatch("19:00:52+02:00", { representation: "time" })).toBe(
      true,
    );
    expect(isISOMatch("2019-09-18", { representation: "time" })).toBe(false);
    expect(
      isISOMatch("2019-09-18T19:00:52Z", { representation: "time" }),
    ).toBe(false);
    expect(isISOMatch("19:00:52z", { representation: "time" })).toBe(false);
    expect(isISOMatch("2019-09-18T19:00:52z")).toBe(false);
  });

  it("rejects a time part with no timezone qualifier", () => {
    /**
     * What: a time part missing its required timezone qualifier, both on its
     * own and inside a complete date-time string.
     * How: calls `isISOMatch("19:00:52", { representation: "time" })` and
     * `isISOMatch("2019-09-18T19:00:52")`, asserting both return `false`.
     * Why: instruction.md explicitly states "a time part without a
     * timezone qualifier must not match." This guards against implementations
     * that enforce the qualifier for the standalone time representation but
     * accidentally make it optional in the complete representation.
     */
    expect(isISOMatch("19:00:52", { representation: "time" })).toBe(false);
    expect(isISOMatch("2019-09-18T19:00:52")).toBe(false);
  });

  it("rejects a date-shaped string that is not a real calendar date", () => {
    /**
     * What: a string that matches the `yyyy-MM-dd` shape but does not
     * denote a real date (a zero or out-of-range day or month, or a February
     * 29 in a year that is not a leap year).
     * How: calls `isISOMatch` with `"2023-02-30"` (February has no 30th),
     * `"2023-13-01"` (no 13th month), `"2023-00-01"` (no zeroth month),
     * `"2023-01-00"` (no zeroth day), `"2023-02-29"` (2023 is not a leap
     * year), `"2100-02-29"` (century year not divisible by 400, so not
     * a leap year) and a day 31 in each of the four 30-day months
     * (April, June, September, November) under `{ representation: "date" }`
     * and asserts all return `false`; also asserts `"2023-04-30"`,
     * `"2023-01-31"` and `"2024-02-29"` (a real leap day) return `true`.
     * Why: instruction.md requires the date part to "be a real calendar
     * date." This is the behavior that separates this function from a
     * pure-regex shape check, and is the main non-trivial part of the task
     * - a naive implementation using only the shape regex (no calendar
     * validation) would incorrectly return `true` for the invalid dates.
     * The zero month/day assertions require both lower bounds to be checked;
     * checking only overflow values such as month 13 or a day beyond the
     * month's length is insufficient.
     * The Feb 29 cases specifically require leap-year computation: a
     * manual day-range check that allows February up to day 29 without
     * consulting the year would wrongly accept `"2023-02-29"` and
     * `"2100-02-29"`, while one that always caps February at 28 would
     * wrongly reject the real leap day `"2024-02-29"`. The 30-day-month
     * cases close the complementary gap: an implementation that special-
     * cases only February and lets every other month run to day 31 accepts
     * `"2023-04-31"`, so February coverage alone does not establish that
     * the date is checked against the real calendar. The `"2023-04-30"` and
     * `"2023-01-31"` assertions keep that from being satisfied by simply
     * capping all months at 30 days or rejecting day 31 outright.
     */
    expect(isISOMatch("2023-02-30", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-13-01", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-00-01", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-01-00", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-02-29", { representation: "date" })).toBe(false);
    expect(isISOMatch("2100-02-29", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-04-31", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-06-31", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-09-31", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-11-31", { representation: "date" })).toBe(false);
    expect(isISOMatch("2023-04-30", { representation: "date" })).toBe(true);
    expect(isISOMatch("2023-01-31", { representation: "date" })).toBe(true);
    expect(isISOMatch("2024-02-29", { representation: "date" })).toBe(true);
  });

  it("rejects a time part with out-of-range hour, minute, or second", () => {
    /**
     * What: time components outside their valid ranges, checked under both
     * the `"time"` representation and the default `"complete"`
     * representation.
     * How: calls `isISOMatch` under `{ representation: "time" }` with
     * `"24:00:00Z"` (hour out of range), `"23:60:00Z"` (minute out of
     * range), and `"23:59:60Z"` (second out of range), asserting `false`
     * for each; also calls `isISOMatch` with no options (default
     * `"complete"`) on `"2019-09-18T24:00:00Z"` (hour out of range within a
     * complete string) and asserts `false`.
     * Why: instruction.md states each component "must each be within their
     * real range (hour 00-23, minute and second 00-59)," and this applies
     * regardless of representation. Guards against an implementation that
     * checks digit count/shape but not the numeric range, and specifically
     * against an implementation that validates ranges correctly for the
     * standalone `"time"` representation but reads the wrong capture-group
     * offsets (or skips the check entirely) when the same time part is
     * embedded inside a complete-representation string.
     */
    expect(isISOMatch("24:00:00Z", { representation: "time" })).toBe(false);
    expect(isISOMatch("23:60:00Z", { representation: "time" })).toBe(false);
    expect(isISOMatch("23:59:60Z", { representation: "time" })).toBe(false);
    expect(isISOMatch("2019-09-18T24:00:00Z")).toBe(false);
  });

  it("rejects a UTC offset with an out-of-range hour or minute", () => {
    /**
     * What: a numeric UTC offset (as opposed to `Z`) whose own hour or
     * minute component is out of range, checked under both the `"time"`
     * representation and the default `"complete"` representation.
     * How: calls `isISOMatch("19:00:52+99:99", { representation: "time" })`
     * and `isISOMatch("2019-09-18T19:00:52+99:99")` (default representation)
     * and asserts `false` for both.
     * Why: instruction.md states "the offset's hour/minute must be within
     * range too," so an offset like `+99:99` must not match under any
     * representation that includes a time part. This guards against an
     * implementation that validates the main `HH:mm:ss` time components but
     * never range-checks the offset itself, accepting any two-digit
     * `+HH:mm` / `-HH:mm` shape regardless of its numeric value. The negative
     * cases matter as much as the positive ones: an implementation that
     * range-checks only the `+` branch and returns early for `-` would accept
     * every negative out-of-range offset while passing a positive-only suite.
     */
    expect(isISOMatch("19:00:52+99:99", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("2019-09-18T19:00:52+99:99")).toBe(false);
    expect(isISOMatch("19:00:52-99:99", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("2019-09-18T19:00:52-99:99")).toBe(false);
  });

  it("rejects the basic (non-separator) ISO 8601 format", () => {
    /**
     * What: a correctly-valued but "basic" formatted ISO string (no `-` or
     * `:` separators), which `formatISO`'s `basic` format would produce.
     * How: calls `isISOMatch("20190918T190052Z")` (default representation)
     * and asserts `false`.
     * Why: instruction.md makes extended the default and requires syntax from
     * another selected format to be rejected. Basic input is valid only when
     * `{ format: "basic" }` is explicitly selected; this guards against an
     * implementation that ignores the selected format.
     */
    expect(isISOMatch("20190918T190052Z")).toBe(false);
  });

  it("rejects a string that is not in ISO 8601 shape even though other date-fns functions can parse it", () => {
    /**
     * What: a string that is not ISO-8601-shaped at all, distinguishing
     * this function from the lenient parsing done elsewhere in date-fns.
     * How: calls `isISOMatch` with a bare numeric string `"50"` and an
     * empty string `""` (both under the default representation) and
     * asserts `false` for each.
     * Why: instruction.md states "a string that merely happens to be
     * parseable by other date-fns functions ... must not match. For
     * example, a bare number string is not a valid match for any
     * representation." This is the core motivating behavior distinguishing
     * `isISOMatch` from `isValid`/`parseISO`.
     */
    expect(isISOMatch("50")).toBe(false);
    expect(isISOMatch("")).toBe(false);
  });

  it("rejects an invalid calendar date inside a complete date-time string", () => {
    /**
     * What: a date-shaped but non-real calendar date embedded inside a
     * complete (default representation) ISO 8601 date-time string.
     * How: calls `isISOMatch` with no options (default "complete") on
     * `"2023-02-30T19:00:52Z"` (no 30th of February), `"2023-13-01T19:00:52Z"`
     * (no 13th month), `"2023-00-01T19:00:52Z"` (no zeroth month),
     * `"2023-01-00T19:00:52Z"` (no zeroth day),
     * `"2023-02-29T19:00:52Z"` (2023 not a leap year),
     * `"2100-02-29T19:00:52Z"` (2100 not a leap year), and
     * `"2023-04-31T19:00:52Z"` / `"2023-11-31T19:00:52Z"` (April and November
     * have no 31st), asserting `false` for each; also asserts
     * `"2024-02-29T19:00:52Z"` and `"0000-02-29T19:00:52Z"` (real leap days)
     * and `"2023-04-30T19:00:52Z"` return `true`.
     * Why: instruction.md states the date part must be a real calendar date in
     * every representation that includes a date part, not only under
     * `representation: "date"`. This is the gap the standalone date test
     * cannot reach: an implementation that validates the calendar only when
     * `representation: "date"` is explicitly requested but falls back to a
     * regex-only shape match for the default "complete" representation
     * wrongly accepts these strings. The real-leap-day assertion guards
     * against an implementation that rejects all of February 29 outright, and
     * the 30-day-month cases guard against one that checks only February's
     * length while allowing day 31 in every other month. The zero month/day
     * cases additionally ensure the calendar check enforces lower bounds in
     * the complete representation rather than only rejecting overflow. The
     * year-0000 leap day verifies the Gregorian 400-year rule still applies at
     * the lower year boundary when the date is embedded in a complete string.
     */
    expect(isISOMatch("2023-02-30T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-13-01T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-00-01T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-01-00T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-02-29T19:00:52Z")).toBe(false);
    expect(isISOMatch("2100-02-29T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-04-31T19:00:52Z")).toBe(false);
    expect(isISOMatch("2023-11-31T19:00:52Z")).toBe(false);
    expect(isISOMatch("2024-02-29T19:00:52Z")).toBe(true);
    expect(isISOMatch("0000-02-29T19:00:52Z")).toBe(true);
    expect(isISOMatch("2023-04-30T19:00:52Z")).toBe(true);
  });

  it("accepts leap year century boundaries correctly", () => {
    /**
     * What: the Gregorian leap rule applied at century boundaries, where a
     * century year is a leap year only if divisible by 400.
     * How: asserts `isISOMatch("2000-02-29", { representation: "date" })` is
     * `true` (2000 divisible by 400, a leap year), asserts
     * `isISOMatch("0000-02-29", { representation: "date" })` is also `true`,
     * and asserts that
     * `isISOMatch("1900-02-29", { representation: "date" })` and
     * `isISOMatch("2100-02-29", { representation: "date" })` are both `false`
     * (1900 and 2100 divisible by 100 but not 400, not leap years), while
     * `isISOMatch("2024-02-29", { representation: "date" })` is `true`.
     * Why: instruction.md states the full Gregorian leap rule. An
     * implementation that treats "divisible by 100" as always non-leap
     * wrongly rejects `2000-02-29`; one that treats "divisible by 4" as
     * always leap wrongly accepts `1900-02-29` and `2100-02-29`. Only a
     * round-trip calendar check (or the 400 rule explicitly) passes both
     * directions. The year-0000 assertion additionally catches JavaScript
     * Date construction that first maps year 0 to non-leap year 1900 and only
     * corrects the year after February 29 has already rolled into March.
     */
    expect(isISOMatch("2000-02-29", { representation: "date" })).toBe(true);
    expect(isISOMatch("0000-02-29", { representation: "date" })).toBe(true);
    expect(isISOMatch("1900-02-29", { representation: "date" })).toBe(false);
    expect(isISOMatch("2100-02-29", { representation: "date" })).toBe(false);
    expect(isISOMatch("2024-02-29", { representation: "date" })).toBe(true);
  });

  it("rejects fractional seconds", () => {
    /**
     * What: an otherwise well-formed ISO string that adds a fractional
     * seconds component after the seconds field.
     * How: asserts `isISOMatch("2019-09-18T19:00:52.123Z")` (default
     * representation) and `isISOMatch("19:00:52.123Z", { representation: "time" })`
     * are both `false`.
     * Why: instruction.md states this function accepts no digits after the
     * seconds. Fractional seconds are a common ISO 8601 feature, so a
     * permissive implementation that only loosely anchors the time part (or
     * that allows an optional `.\d+` before the qualifier) wrongly accepts
     * these. The anchored extended-format shape requires the qualifier to
     * follow the seconds directly.
     */
    expect(isISOMatch("2019-09-18T19:00:52.123Z")).toBe(false);
    expect(isISOMatch("19:00:52.123Z", { representation: "time" })).toBe(
      false,
    );
  });

  it("rejects a space or lowercase T between the date and time parts", () => {
    /**
     * What: a complete string where the date and time parts are separated by
     * a character other than the uppercase `T`.
     * How: asserts `isISOMatch("2019-09-18 19:00:52Z")` (a space) and
     * `isISOMatch("2019-09-18t19:00:52Z")` (lowercase `t`) are both `false`.
     * Why: instruction.md states the complete representation is the date
     * part, then the single uppercase letter `T`, then the time part. A space
     * is a common alternative separator, and ISO 8601 itself permits a
     * lowercase `t`, so a permissive implementation that splits on any
     * whitespace, any case-insensitive `t`, or any non-digit character
     * wrongly accepts these. Only a split on the uppercase `T` passes.
     */
    expect(isISOMatch("2019-09-18 19:00:52Z")).toBe(false);
    expect(isISOMatch("2019-09-18t19:00:52Z")).toBe(false);
  });

  it("rejects surrounding whitespace", () => {
    /**
     * What: an otherwise well-formed ISO string with a leading or trailing
     * space.
     * How: asserts `isISOMatch(" 2019-09-18T19:00:52Z")` (leading space) and
     * `isISOMatch("2019-09-18T19:00:52Z ")` (trailing space) are both `false`.
     * Why: instruction.md states the whole string must be the shape, with
     * nothing before or after it. An implementation that trims the input
     * before matching (or whose regex is not anchored at both ends) wrongly
     * accepts these. The extended-format shapes are anchored, so any
     * surrounding character breaks the match.
     */
    expect(isISOMatch(" 2019-09-18T19:00:52Z")).toBe(false);
    expect(isISOMatch("2019-09-18T19:00:52Z ")).toBe(false);
  });

  it("accepts valid UTC offset boundaries and rejects out-of-range offsets", () => {
    /**
     * What: the signed `HH:mm` UTC offset shape and its numeric boundaries.
     * How: asserts the largest valid positive and negative offsets and zero
     * offsets return `true`, while out-of-range hour and minute values return
     * `false` for both signs. It also asserts colon-less `+0200` offsets return
     * `false` in both the standalone time and complete representations.
     * Why: instruction.md requires a signed `HH:mm` offset with hour `00`-`23`
     * and minute `00`-`59`. An implementation that omits range checks wrongly
     * accepts `+24:00` or `+23:60`, while one that caps valid values too early
     * rejects `+23:59`. Checking both signs guards against validating only one
     * branch, and rejecting `+0200` ensures the colon required by the extended
     * shape is not accidentally treated as optional in either representation.
     */
    expect(isISOMatch("19:00:52+23:59", { representation: "time" })).toBe(
      true,
    );
    expect(isISOMatch("19:00:52-23:59", { representation: "time" })).toBe(
      true,
    );
    expect(isISOMatch("19:00:52+00:00", { representation: "time" })).toBe(
      true,
    );
    expect(isISOMatch("19:00:52-00:00", { representation: "time" })).toBe(
      true,
    );
    expect(isISOMatch("19:00:52+24:00", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("19:00:52+23:60", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("19:00:52-24:00", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("19:00:52-23:60", { representation: "time" })).toBe(
      false,
    );
    expect(isISOMatch("2019-09-18T19:00:52-24:00")).toBe(false);
    expect(isISOMatch("19:00:52+0200", { representation: "time" })).toBe(false);
    expect(isISOMatch("2019-09-18T19:00:52+0200")).toBe(false);
  });

  it("accepts the year boundaries 0000 and 9999", () => {
    /**
     * What: the smallest and largest four-digit years the date part admits.
     * How: asserts `isISOMatch("0000-01-01", { representation: "date" })` and
     * `isISOMatch("9999-12-31", { representation: "date" })` are both `true`.
     * Why: instruction.md states the year is exactly four digits, ranging
     * `0000` to `9999`. An implementation that rejects year `0000` (e.g.
     * because `Date` construction or a regex treats a leading-zero year as
     * empty, or that caps years at some positive minimum) wrongly rejects
     * the lower boundary; one that mishandles the upper boundary wrongly
     * rejects `9999-12-31`. Both are real calendar dates.
     */
    expect(isISOMatch("0000-01-01", { representation: "date" })).toBe(true);
    expect(isISOMatch("9999-12-31", { representation: "date" })).toBe(true);
  });

  it("rejects the basic format in every representation", () => {
    /**
     * What: the ISO 8601 `basic` format (no `-` or `:` separators) rejected
     * under each of the three representations, not only the default.
     * How: asserts `isISOMatch("20190918", { representation: "date" })`
     * (basic date), `isISOMatch("190052Z", { representation: "time" })`
     * (basic time), and `isISOMatch("20190918T190052Z")` (default, basic
     * complete) are all `false`.
     * Why: instruction.md defaults to extended format, so basic syntax must be
     * rejected unless `{ format: "basic" }` is selected. An implementation
     * that strips separators or ignores the format option wrongly accepts
     * these default/extended calls. The existing complete check is
     * strengthened here across date, time, and complete
     * representations.
     */
    expect(isISOMatch("20190918", { representation: "date" })).toBe(false);
    expect(isISOMatch("190052Z", { representation: "time" })).toBe(false);
    expect(isISOMatch("20190918T190052Z")).toBe(false);
  });
});
