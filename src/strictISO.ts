/**
 * Shared strict ISO 8601 parsing and validation logic.
 *
 * All calendar validation uses pure proleptic Gregorian math — never
 * ECMAScript `Date` — so the text-only APIs (`isISOMatch`, `normalizeISO`)
 * can validate years outside the `Date` representable range.
 */

/* ---------- Proleptic Gregorian calendar math (no Date) ---------- */

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(year: number, month: number): number {
  // month is 1-12 (every call site validates this before calling); the `!`
  // documents that invariant for `noUncheckedIndexedAccess` rather than
  // silently trusting it.
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_LENGTHS[month - 1]!;
}

/** Days from 1970-01-01 (Howard Hinnant's civil-from-days algorithm). */
export function daysFromCivil(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const era = Math.floor(y / 400);
  const yoe = y - era * 400; // [0, 399]
  const doy = Math.floor((153 * (m - 3) + 2) / 5) + day - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  return era * 146097 + doe - 719468;
}

/**
 * Inverse of {@link daysFromCivil} (Howard Hinnant's `civil_from_days`):
 * converts a day-count since 1970-01-01 back into a proleptic Gregorian
 * calendar date. Used by the Temporal shim for date arithmetic (add N days,
 * then convert the resulting day-count back to year/month/day).
 */
export function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719468;
  // Plain floor division. (Hinnant's reference C++ uses `(z >= 0 ? z : z -
  // 146096) / 146097` because C++'s `/` truncates toward zero for negative
  // operands; that bias trick makes truncation behave like floor division.
  // JS's Math.floor already *is* floor division, so applying the bias trick
  // on top of it double-corrects and is off by one for negative `z`.)
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097; // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  ); // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153); // [0, 11]
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
  const month = mp + (mp < 10 ? 3 : -9); // [1, 12]
  const year = y + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

/** ISO day of week: 1=Monday … 7=Sunday. */
export function isoDayOfWeek(year: number, month: number, day: number): number {
  const d = daysFromCivil(year, month, day);
  return mod7(d + 3) + 1;
}

function mod7(n: number): number {
  return ((n % 7) + 7) % 7;
}

/** Number of ISO weeks in a week-numbering year (52 or 53). */
export function weeksInISOYear(weekYear: number): number {
  // A year has 53 weeks iff Jan 1 is Thursday, or Jan 1 is Wednesday and leap.
  const jan1Dow = isoDayOfWeek(weekYear, 1, 1);
  if (jan1Dow === 4) return 53;
  if (jan1Dow === 3 && isLeapYear(weekYear)) return 53;
  return 52;
}

/* ---------- Year grammar ---------- */

export type AdditionalDigits = 0 | 1 | 2;

export interface ParsedYear {
  year: number;
  rest: string;
}

/** Parse the year at the start of `str` according to the signed-year grammar. */
export function parseYear(
  str: string,
  additionalDigits: AdditionalDigits,
): ParsedYear | null {
  const first = str[0];
  if (first === "+" || first === "-") {
    const width = 4 + additionalDigits;
    const digits = str.slice(1, 1 + width);
    if (digits.length === width && /^\d+$/.test(digits)) {
      const abs = parseInt(digits, 10);
      const year = first === "-" ? -abs : abs;
      return { year, rest: str.slice(1 + width) };
    }
    return null;
  }
  // unsigned 4-digit year
  if (str.length >= 4 && /^\d{4}$/.test(str.slice(0, 4))) {
    const year = parseInt(str.slice(0, 4), 10);
    return { year, rest: str.slice(4) };
  }
  return null;
}

/** Format a year per the shared signed-year grammar.  Throws RangeError
 * when the year cannot fit the selected signed width. */
export function formatYear(year: number, additionalDigits: AdditionalDigits): string {
  if (year >= 0 && year <= 9999) {
    return pad4(year);
  }
  const width = 4 + additionalDigits;
  const abs = Math.abs(year);
  const max = Math.pow(10, width) - 1;
  if (abs > max) {
    throw new RangeError(
      `Year ${year} is out of range for additionalDigits ${additionalDigits}`,
    );
  }
  return (year < 0 ? "-" : "+") + pad(abs, width);
}

function pad4(n: number): string {
  return String(Math.abs(n)).padStart(4, "0");
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/* ---------- Date-part parsing ---------- */

export type ISODateRepresentation = "calendar" | "ordinal" | "week";
export type ISOFormat = "extended" | "basic";
export type ISORepresentation = "complete" | "date" | "time";

export interface ParsedDatePart {
  dateRepresentation: ISODateRepresentation;
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
  weekYear: number;
  week: number;
  isoDay: number;
}

export function parseDatePart(
  str: string,
  format: ISOFormat,
  dateRepresentation: ISODateRepresentation,
  additionalDigits: AdditionalDigits,
): ParsedDatePart | null {
  const y = parseYear(str, additionalDigits);
  if (!y) return null;
  const rest = y.rest;

  if (dateRepresentation === "calendar") {
    const m = format === "extended"
      ? /^-(\d{2})-(\d{2})$/.exec(rest)
      : /^(\d{2})(\d{2})$/.exec(rest);
    if (!m) return null;
    // Fixed 2-group pattern: a successful exec() guarantees m[1]/m[2] exist.
    const month = parseInt(m[1]!, 10);
    const day = parseInt(m[2]!, 10);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(y.year, month))
      return null;
    return toParsedDate(y.year, month, day, dateRepresentation);
  }

  if (dateRepresentation === "ordinal") {
    const m = format === "extended" ? /^-(\d{3})$/.exec(rest) : /^(\d{3})$/.exec(rest);
    if (!m) return null;
    const doy = parseInt(m[1]!, 10); // fixed 1-group pattern
    const maxDoy = isLeapYear(y.year) ? 366 : 365;
    if (doy < 1 || doy > maxDoy) return null;
    return toParsedDateFromOrdinal(y.year, doy, dateRepresentation);
  }

  // week
  const m = format === "extended"
    ? /^-W(\d{2})-(\d)$/.exec(rest)
    : /^W(\d{2})(\d)$/.exec(rest);
  if (!m) return null;
  // Fixed 2-group pattern: a successful exec() guarantees m[1]/m[2] exist.
  const week = parseInt(m[1]!, 10);
  const isoDay = parseInt(m[2]!, 10);
  if (isoDay < 1 || isoDay > 7) return null;
  const maxWeek = weeksInISOYear(y.year);
  if (week < 1 || week > maxWeek) return null;
  return toParsedDateFromWeek(y.year, week, isoDay, dateRepresentation);
}

/* ---------- Conversions among calendar, ordinal, week ---------- */

function ordinalToCalendar(year: number, doy: number): { month: number; day: number } {
  let remaining = doy;
  let month = 1;
  while (remaining > daysInMonth(year, month)) {
    remaining -= daysInMonth(year, month);
    month++;
  }
  return { month, day: remaining };
}

function calendarToOrdinal(year: number, month: number, day: number): number {
  let doy = day;
  for (let m = 1; m < month; m++) {
    doy += daysInMonth(year, m);
  }
  return doy;
}

function calendarToWeek(year: number, month: number, day: number): {
  weekYear: number;
  week: number;
  isoDay: number;
} {
  const dow = isoDayOfWeek(year, month, day);
  const doy = calendarToOrdinal(year, month, day);
  // ISO week algorithm
  let week = Math.floor((doy - dow + 10) / 7);
  let weekYear = year;
  if (week < 1) {
    weekYear = year - 1;
    week = weeksInISOYear(weekYear);
  } else if (week > weeksInISOYear(year)) {
    weekYear = year + 1;
    week = 1;
  }
  return { weekYear, week, isoDay: dow };
}

function weekToCalendar(weekYear: number, week: number, isoDay: number): {
  year: number;
  month: number;
  day: number;
} {
  // Find Jan 4 of weekYear (always in week 1)
  const jan4Dow = isoDayOfWeek(weekYear, 1, 4);
  // Monday of week 1 = Jan 4 - (jan4Dow - 1) days
  const week1MondayDoy = 4 - (jan4Dow - 1); // day-of-year of Monday of week 1
  const targetDoy = week1MondayDoy + (week - 1) * 7 + (isoDay - 1);
  // Convert ordinal to calendar
  const isLeap = isLeapYear(weekYear);
  const maxDoy = isLeap ? 366 : 365;
  let year = weekYear;
  let doy = targetDoy;
  if (doy < 1) {
    year = weekYear - 1;
    doy += isLeapYear(year) ? 366 : 365;
  } else if (doy > maxDoy) {
    doy -= maxDoy;
    year = weekYear + 1;
  }
  const cal = ordinalToCalendar(year, doy);
  return { year, month: cal.month, day: cal.day };
}

function toParsedDate(
  year: number,
  month: number,
  day: number,
  rep: ISODateRepresentation,
): ParsedDatePart {
  const doy = calendarToOrdinal(year, month, day);
  const w = calendarToWeek(year, month, day);
  return {
    dateRepresentation: rep,
    year,
    month,
    day,
    dayOfYear: doy,
    weekYear: w.weekYear,
    week: w.week,
    isoDay: w.isoDay,
  };
}

function toParsedDateFromOrdinal(
  year: number,
  doy: number,
  rep: ISODateRepresentation,
): ParsedDatePart {
  const cal = ordinalToCalendar(year, doy);
  return toParsedDate(year, cal.month, cal.day, rep);
}

function toParsedDateFromWeek(
  weekYear: number,
  week: number,
  isoDay: number,
  rep: ISODateRepresentation,
): ParsedDatePart {
  const cal = weekToCalendar(weekYear, week, isoDay);
  return toParsedDate(cal.year, cal.month, cal.day, rep);
}

/* ---------- Time-part parsing ---------- */

export interface ParsedTimePart {
  hours: number;
  minutes: number;
  seconds: number;
  offsetMinutes: number;
  /** Raw qualifier string for text-preserving APIs. */
  offsetRaw: string;
}

export function parseTimePart(
  str: string,
  format: ISOFormat,
): ParsedTimePart | null {
  if (format === "extended") {
    // HH:mm:ssZ | HH:mm:ss+HH:mm | HH:mm:ss-HH:mm
    const m = /^(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(str);
    if (!m) return null;
    // Fixed 4-group pattern: a successful exec() guarantees m[1..4] exist.
    return validateTime(m[1]!, m[2]!, m[3]!, m[4]!, true);
  }
  // basic: HHmmssZ | HHmmss+HHmm | HHmmss-HHmm
  const m = /^(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})$/.exec(str);
  if (!m) return null;
  return validateTime(m[1]!, m[2]!, m[3]!, m[4]!, false);
}

function validateTime(
  h: string,
  min: string,
  sec: string,
  offset: string,
  extended: boolean,
): ParsedTimePart | null {
  const hours = parseInt(h, 10);
  const minutes = parseInt(min, 10);
  const seconds = parseInt(sec, 10);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  let offsetMinutes = 0;
  if (offset !== "Z") {
    const re = extended ? /^([+-])(\d{2}):(\d{2})$/ : /^([+-])(\d{2})(\d{2})$/;
    const om = re.exec(offset);
    if (!om) return null;
    // Fixed 3-group pattern: a successful exec() guarantees om[1..3] exist.
    const oh = parseInt(om[2]!, 10);
    const omin = parseInt(om[3]!, 10);
    if (oh > 23 || omin > 59) return null;
    offsetMinutes = (oh * 60 + omin) * (om[1]! === "-" ? -1 : 1);
  }

  return { hours, minutes, seconds, offsetMinutes, offsetRaw: offset };
}

/* ---------- Combined parse ---------- */

export interface StrictISOParseResult {
  datePart: ParsedDatePart | null;
  timePart: ParsedTimePart | null;
}

export interface StrictISOOptions {
  representation?: ISORepresentation;
  format?: ISOFormat;
  dateRepresentation?: ISODateRepresentation;
  additionalDigits?: AdditionalDigits;
}

export function parseStrictISO(
  str: string,
  opts: StrictISOOptions,
): StrictISOParseResult | null {
  const representation = opts.representation ?? "complete";
  const format = opts.format ?? "extended";
  const dateRepresentation = opts.dateRepresentation ?? "calendar";
  const additionalDigits = opts.additionalDigits ?? 2;

  if (representation === "time") {
    const tp = parseTimePart(str, format);
    if (!tp) return null;
    return { datePart: null, timePart: tp };
  }

  if (representation === "date") {
    const dp = parseDatePart(str, format, dateRepresentation, additionalDigits);
    if (!dp) return null;
    return { datePart: dp, timePart: null };
  }

  // complete: date + T + time
  // Find the uppercase T separator
  const tIndex = str.indexOf("T");
  if (tIndex === -1) return null;
  const dateStr = str.slice(0, tIndex);
  const timeStr = str.slice(tIndex + 1);

  const dp = parseDatePart(dateStr, format, dateRepresentation, additionalDigits);
  if (!dp) return null;
  const tp = parseTimePart(timeStr, format);
  if (!tp) return null;
  return { datePart: dp, timePart: tp };
}

/* ---------- Timestamp computation (for Date-producing APIs) ---------- */

export function computeTimestamp(
  datePart: ParsedDatePart,
  timePart: ParsedTimePart | null,
): number {
  const days = daysFromCivil(datePart.year, datePart.month, datePart.day);
  let ts = days * 86400000;
  if (timePart) {
    ts += timePart.hours * 3600000 + timePart.minutes * 60000 + timePart.seconds * 1000;
    // offsetMinutes is signed value added to UTC to obtain local time.
    // UTC = local - offset
    ts -= timePart.offsetMinutes * 60000;
  }
  return ts;
}
