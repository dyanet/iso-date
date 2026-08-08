import {
  formatYear,
  parseStrictISO,
  type AdditionalDigits,
  type ISODateRepresentation,
  type ISOFormat,
} from "./strictISO.js";

function addLeadingZeros(value: number, targetLength: number): string {
  const sign = value < 0 ? "-" : "";
  const output = Math.abs(value).toString().padStart(targetLength, "0");
  return sign + output;
}

export interface NormalizeISOOptions {
  representation?: "complete" | "date";
  inputFormat?: ISOFormat;
  inputDateRepresentation?: ISODateRepresentation;
  inputAdditionalDigits?: AdditionalDigits;
  outputFormat?: ISOFormat;
  outputDateRepresentation?: ISODateRepresentation;
  outputAdditionalDigits?: AdditionalDigits;
}

/**
 * Reformats a strict ISO 8601 string: converts between basic and extended
 * syntax, and between the calendar, ordinal, and ISO week-date
 * representations, without changing the instant the string describes.
 *
 * Preserves how the string spelled its timezone -- a trailing `Z` stays `Z`,
 * and a signed zero offset (`+00:00` vs `-00:00`) is preserved rather than
 * normalized away, since ISO 8601 treats those as textually distinct even
 * though they denote the same instant.
 *
 * Throws `RangeError` when `dateString` isn't strict ISO 8601 in the
 * requested input shape.
 */
export function normalizeISO(
  dateString: string,
  options?: NormalizeISOOptions,
): string {
  const representation = options?.representation ?? "complete";
  const inputFormat = options?.inputFormat ?? "extended";
  const inputDateRep = options?.inputDateRepresentation ?? "calendar";
  const inputAddDigits = options?.inputAdditionalDigits ?? 2;
  const outputFormat = options?.outputFormat ?? "extended";
  const outputDateRep = options?.outputDateRepresentation ?? "calendar";
  const outputAddDigits = options?.outputAdditionalDigits ?? 2;

  const result = parseStrictISO(dateString, {
    representation,
    format: inputFormat,
    dateRepresentation: inputDateRep,
    additionalDigits: inputAddDigits,
  });

  if (!result || !result.datePart) {
    throw new RangeError("Invalid ISO 8601 string");
  }

  const dp = result.datePart;
  const tp = result.timePart;
  const dateDelimiter = outputFormat === "extended" ? "-" : "";

  let dateStr: string;
  if (outputDateRep === "ordinal") {
    const year = formatYear(dp.year, outputAddDigits);
    const doy = addLeadingZeros(dp.dayOfYear, 3);
    dateStr = `${year}${dateDelimiter}${doy}`;
  } else if (outputDateRep === "week") {
    const weekYear = formatYear(dp.weekYear, outputAddDigits);
    const week = addLeadingZeros(dp.week, 2);
    const day = dp.isoDay;
    dateStr = `${weekYear}${dateDelimiter}W${week}${dateDelimiter}${day}`;
  } else {
    const year = formatYear(dp.year, outputAddDigits);
    const month = addLeadingZeros(dp.month, 2);
    const day = addLeadingZeros(dp.day, 2);
    dateStr = `${year}${dateDelimiter}${month}${dateDelimiter}${day}`;
  }

  if (representation === "date") {
    return dateStr;
  }

  if (!tp) throw new RangeError("Invalid ISO 8601 string");

  const timeDelimiter = outputFormat === "extended" ? ":" : "";
  const h = addLeadingZeros(tp.hours, 2);
  const m = addLeadingZeros(tp.minutes, 2);
  const s = addLeadingZeros(tp.seconds, 2);
  const time = `${h}${timeDelimiter}${m}${timeDelimiter}${s}`;

  let offset: string;
  if (tp.offsetRaw === "Z") {
    offset = "Z";
  } else {
    const sign = tp.offsetRaw[0];
    const digits = tp.offsetRaw.slice(1).replace(/[:]/g, "");
    const oh = digits.slice(0, 2);
    const om = digits.slice(2, 4);
    offset =
      outputFormat === "extended" ? `${sign}${oh}:${om}` : `${sign}${oh}${om}`;
  }

  return `${dateStr}T${time}${offset}`;
}
