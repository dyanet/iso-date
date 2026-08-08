/**
 * `differenceInCalendarDays` counts whole calendar days between two local
 * dates, ignoring time-of-day (unlike `(a.getTime() - b.getTime()) /
 * 86400000`, which is thrown off by DST transitions and any time-of-day
 * difference between the two arguments). Uses the same pure day-count
 * conversion the `strict` ISO family uses -- no Temporal engine needed,
 * since this is a single subtraction, not arithmetic with overflow rules.
 */

import { daysFromCivil } from "../strictISO.js";

export function differenceInCalendarDays(dateLeft: Date, dateRight: Date): number {
  const left = daysFromCivil(dateLeft.getFullYear(), dateLeft.getMonth() + 1, dateLeft.getDate());
  const right = daysFromCivil(
    dateRight.getFullYear(),
    dateRight.getMonth() + 1,
    dateRight.getDate(),
  );
  return left - right;
}
