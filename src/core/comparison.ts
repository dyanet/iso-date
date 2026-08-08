/**
 * Comparisons. `isBefore`/`isAfter`/`isEqual`/`compareAsc`/`compareDesc`
 * compare full instants (timestamp, including time-of-day) -- plain
 * `getTime()` math, no calendar engine needed. `isSameDay`/`isSameMonth`/
 * `isSameYear` compare local calendar fields directly -- also no calendar
 * engine needed, since equality doesn't involve the overflow/clamping
 * rules that make arithmetic non-trivial.
 */

export function isBefore(date: Date, dateToCompare: Date): boolean {
  return date.getTime() < dateToCompare.getTime();
}

export function isAfter(date: Date, dateToCompare: Date): boolean {
  return date.getTime() > dateToCompare.getTime();
}

export function isEqual(date: Date, dateToCompare: Date): boolean {
  return date.getTime() === dateToCompare.getTime();
}

export function compareAsc(dateA: Date, dateB: Date): -1 | 0 | 1 {
  const diff = dateA.getTime() - dateB.getTime();
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

export function compareDesc(dateA: Date, dateB: Date): -1 | 0 | 1 {
  const diff = dateA.getTime() - dateB.getTime();
  if (diff < 0) return 1;
  if (diff > 0) return -1;
  return 0;
}

export function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function isSameMonth(dateA: Date, dateB: Date): boolean {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

export function isSameYear(dateA: Date, dateB: Date): boolean {
  return dateA.getFullYear() === dateB.getFullYear();
}
