/**
 * Calendar-day/month/year arithmetic. Public API is plain `Date` in,
 * plain `Date` out -- the time-of-day is preserved untouched, the same
 * convention date-fns's own `addDays` etc. use. Internally, the calendar
 * part of the math goes through the active Temporal engine (native
 * `Temporal.PlainDate` when available, otherwise the dependency-free
 * shim), which applies the default "constrain" overflow rule: adding a
 * month to Jan 31 lands on Feb 28/29, not March 3.
 */

import { toPlainDate, withPlainDate } from "./internal.js";

function shift(date: Date, duration: {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}): Date {
  const shifted = toPlainDate(date).add(duration);
  return withPlainDate(date, shifted);
}

export function addDays(date: Date, amount: number): Date {
  return shift(date, { days: amount });
}

export function addWeeks(date: Date, amount: number): Date {
  return shift(date, { weeks: amount });
}

export function addMonths(date: Date, amount: number): Date {
  return shift(date, { months: amount });
}

export function addYears(date: Date, amount: number): Date {
  return shift(date, { years: amount });
}

export function subDays(date: Date, amount: number): Date {
  return shift(date, { days: -amount });
}

export function subWeeks(date: Date, amount: number): Date {
  return shift(date, { weeks: -amount });
}

export function subMonths(date: Date, amount: number): Date {
  return shift(date, { months: -amount });
}

export function subYears(date: Date, amount: number): Date {
  return shift(date, { years: -amount });
}
