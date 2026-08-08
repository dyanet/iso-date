/** Internal helpers converting between plain `Date` (local calendar fields
 * + time-of-day) and the Temporal engine's `PlainDate`. Not part of the
 * public API. */

import { getPlainDate, type PlainDateEngine } from "../temporal/detect.js";
import type { PlainDateLike } from "../temporal/shim.js";

export function toPlainDate(date: Date): PlainDateEngine {
  const PlainDate = getPlainDate();
  return PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/** Returns a new `Date` with `original`'s time-of-day and `pd`'s calendar
 * date, using a single atomic `setFullYear(y, m, d)` call so there's no
 * intermediate invalid state (e.g. setting month alone first could briefly
 * pass through a nonexistent day-of-month). */
export function withPlainDate(original: Date, pd: PlainDateLike): Date {
  const result = new Date(original.getTime());
  result.setFullYear(pd.year, pd.month - 1, pd.day);
  return result;
}
