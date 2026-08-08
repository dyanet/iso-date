/**
 * A minimal, dependency-free implementation of the *subset* of
 * `Temporal.PlainDate` this package's `core` namespace actually uses:
 * construction from y/m/d, `.add`/`.subtract` with Temporal's default
 * "constrain" overflow behavior, `.year`/`.month`/`.day`, and a static
 * `.compare`.
 *
 * This is NOT a general Temporal polyfill (that's `@js-temporal/polyfill`,
 * a real dependency we deliberately don't want) — it's the minimum needed
 * so date arithmetic and comparison work correctly on engines that don't
 * yet ship `Temporal` natively (Node < 26, as of August 2026). Where native
 * `Temporal` is available, {@link getPlainDate} in `./detect.js` returns
 * the real thing instead, and this class is never used.
 *
 * Matching the real API's shape (rather than inventing our own) means
 * `core`'s functions can call the same methods regardless of which one is
 * active, and it means this shim is straightforward to delete once the
 * `engines` field can require Node >= 26.
 */

import { civilFromDays, daysFromCivil, daysInMonth } from "../strictISO.js";

export interface DurationLike {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}

export interface PlainDateLike {
  year: number;
  month: number;
  day: number;
}

export class ShimPlainDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static from(input: PlainDateLike | ShimPlainDate): ShimPlainDate {
    return new ShimPlainDate(input.year, input.month, input.day);
  }

  static fromDaysSinceEpoch(days: number): ShimPlainDate {
    const { year, month, day } = civilFromDays(days);
    return new ShimPlainDate(year, month, day);
  }

  toDaysSinceEpoch(): number {
    return daysFromCivil(this.year, this.month, this.day);
  }

  /**
   * Adds a duration using Temporal's default "constrain" overflow: years
   * and months are applied to the calendar fields first (clamping the day
   * to the target month's length if it would otherwise overflow, e.g.
   * Jan 31 + 1 month -> Feb 28/29, not March 3), then weeks/days are
   * applied as day-count arithmetic.
   */
  add(duration: DurationLike): ShimPlainDate {
    const years = duration.years ?? 0;
    const months = duration.months ?? 0;
    const weeks = duration.weeks ?? 0;
    const days = duration.days ?? 0;

    const totalMonths = this.month - 1 + months;
    let newYear = this.year + years + Math.floor(totalMonths / 12);
    let newMonth = ((totalMonths % 12) + 12) % 12; // [0, 11]
    newMonth += 1; // back to [1, 12]

    const clampedDay = Math.min(this.day, daysInMonth(newYear, newMonth));

    const dayCount = daysFromCivil(newYear, newMonth, clampedDay) + weeks * 7 + days;
    return ShimPlainDate.fromDaysSinceEpoch(dayCount);
  }

  subtract(duration: DurationLike): ShimPlainDate {
    return this.add({
      years: -(duration.years ?? 0),
      months: -(duration.months ?? 0),
      weeks: -(duration.weeks ?? 0),
      days: -(duration.days ?? 0),
    });
  }

  equals(other: PlainDateLike): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day;
  }

  static compare(a: PlainDateLike, b: PlainDateLike): -1 | 0 | 1 {
    const da = daysFromCivil(a.year, a.month, a.day);
    const db = daysFromCivil(b.year, b.month, b.day);
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  }
}
