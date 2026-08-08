import {
  parseStrictISO,
  type AdditionalDigits,
  type ISODateRepresentation,
  type ISOFormat,
  type ISORepresentation,
} from "./strictISO.js";

/** The {@link isISOMatch} function options. */
export interface IsISOMatchOptions {
  /** Which component to require: date, time, or both (complete). */
  representation?: ISORepresentation;
  /** Extended (with separators) or basic (without). */
  format?: ISOFormat;
  /** Calendar, ordinal, or ISO week date representation. */
  dateRepresentation?: ISODateRepresentation;
  /** Extra digits for signed expanded years. */
  additionalDigits?: AdditionalDigits;
}

/**
 * Is the given string a strictly-formed ISO 8601 date string?
 *
 * Returns `true` only when the entire string matches the selected strict
 * ISO 8601 shape and all fields are semantically valid. Unlike `parseISO`
 * (from `date-fns`) or the native `Date` constructor, this does not accept
 * loosely ISO-like strings: a bare number, a basic-format string when
 * extended was requested, or an impossible calendar date all return `false`.
 *
 * Defaults: `representation: "complete"`, `format: "extended"`,
 * `dateRepresentation: "calendar"`, `additionalDigits: 2`.
 *
 * @example
 * isISOMatch("2019-09-18T19:00:52Z") // true
 * isISOMatch("2019-09-18", { representation: "date" }) // true
 * isISOMatch("2023-02-30", { representation: "date" }) // false -- not a real date
 * isISOMatch("20190918T190052Z") // false -- basic format, not requested
 * isISOMatch("50") // false -- not ISO-shaped at all
 */
export function isISOMatch(
  dateString: string,
  options?: IsISOMatchOptions,
): boolean {
  if (typeof dateString !== "string") return false;
  const result = parseStrictISO(dateString, options ?? {});
  return result !== null;
}
