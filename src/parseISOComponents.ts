import {
  computeTimestamp,
  parseStrictISO,
  type AdditionalDigits,
  type ISODateRepresentation,
  type ISOFormat,
} from "./strictISO.js";

export interface ParseISOComponentsOptions {
  representation?: "complete" | "date";
  format?: ISOFormat;
  dateRepresentation?: ISODateRepresentation;
  additionalDigits?: AdditionalDigits;
}

export interface ISOComponents {
  dateRepresentation: ISODateRepresentation;
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
  weekYear: number;
  week: number;
  isoDay: number;
  hours: number;
  minutes: number;
  seconds: number;
  offsetMinutes: number;
  timestamp: number;
}

/**
 * Parses a strict ISO 8601 string into its individual calendar, ordinal,
 * ISO-week, time, and offset fields together -- all mutually consistent with
 * each other -- rather than into a single `Date`. Returns `null` when the
 * string isn't strict ISO 8601 or its timestamp isn't a safe integer.
 *
 * Useful when you need the ISO week-date or ordinal-day fields directly, or
 * when you're working with a year outside `Date`'s representable range (use
 * {@link parseISOComponents} rather than {@link parseISOStrict} in that case).
 */
export function parseISOComponents(
  dateString: string,
  options?: ParseISOComponentsOptions,
): ISOComponents | null {
  const result = parseStrictISO(dateString, {
    representation: options?.representation ?? "complete",
    format: options?.format ?? "extended",
    dateRepresentation: options?.dateRepresentation ?? "calendar",
    additionalDigits: options?.additionalDigits ?? 2,
  });

  if (!result || !result.datePart) return null;

  const dp = result.datePart;
  const tp = result.timePart;

  const timestamp = computeTimestamp(dp, tp);

  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(timestamp))
    return null;
  if (Math.abs(timestamp) > 8.64e15) return null;

  return {
    dateRepresentation: options?.dateRepresentation ?? "calendar",
    year: dp.year,
    month: dp.month,
    day: dp.day,
    dayOfYear: dp.dayOfYear,
    weekYear: dp.weekYear,
    week: dp.week,
    isoDay: dp.isoDay,
    hours: tp ? tp.hours : 0,
    minutes: tp ? tp.minutes : 0,
    seconds: tp ? tp.seconds : 0,
    offsetMinutes: tp ? tp.offsetMinutes : 0,
    timestamp,
  };
}
