import { constructFrom, type ContextFn } from "./constructFrom.js";
import {
  computeTimestamp,
  parseStrictISO,
  type AdditionalDigits,
  type ISODateRepresentation,
  type ISOFormat,
} from "./strictISO.js";

export interface ParseISOStrictOptions<ResultDate extends Date = Date> {
  representation?: "complete" | "date";
  format?: ISOFormat;
  dateRepresentation?: ISODateRepresentation;
  additionalDigits?: AdditionalDigits;
  /** Context date/constructor controlling the returned Date's type and, for
   * date-only strings, the local midnight used. Defaults to plain `Date`. */
  in?: ContextFn<ResultDate>;
}

/**
 * Parses a strict ISO 8601 string into a `Date`. Returns an Invalid Date
 * (`isNaN(result.getTime())`) rather than throwing when the string isn't
 * strict ISO 8601, or describes an instant outside `Date`'s representable
 * range (the same TimeClip rule the ECMAScript `Date` constructor uses).
 *
 * A date-only string (`representation: "date"`, or a `"date"`-shaped input
 * under the default) resolves to local midnight in the requested context.
 */
export function parseISOStrict<ResultDate extends Date = Date>(
  dateString: string,
  options?: ParseISOStrictOptions<ResultDate>,
): ResultDate {
  const result = parseStrictISO(dateString, {
    representation: options?.representation ?? "complete",
    format: options?.format ?? "extended",
    dateRepresentation: options?.dateRepresentation ?? "calendar",
    additionalDigits: options?.additionalDigits ?? 2,
  });

  if (!result || !result.datePart) {
    return constructFrom(options?.in, NaN) as ResultDate;
  }

  if ((options?.representation ?? "complete") === "date") {
    const date = constructFrom(options?.in, 0) as ResultDate;
    date.setFullYear(
      result.datePart.year,
      result.datePart.month - 1,
      result.datePart.day,
    );
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const ts = computeTimestamp(result.datePart, result.timePart);

  // TimeClip range check, matching the ECMAScript Date constructor's own limit.
  if (!Number.isFinite(ts) || Math.abs(ts) > 8.64e15) {
    return constructFrom(options?.in, NaN) as ResultDate;
  }

  return constructFrom(options?.in, ts) as ResultDate;
}
