/**
 * Constructs a date using the reference date's constructor and the given
 * value. Lets `parseISOStrict` accept an `in` context function (or a plain
 * `Date`-like reference) and return a result of the matching type, without
 * this package needing to depend on `date-fns` or `@date-fns/tz` itself.
 *
 * If you pass a `TZDate`/`UTCDate`-style constructor here it will work, since
 * this only relies on the JS `new (SomeDateSubclass)(value)` contract those
 * classes already follow -- no date-fns import required.
 */
export type ContextFn<ResultDate extends Date = Date> = (
  value: number,
) => ResultDate;

export function constructFrom<ResultDate extends Date = Date>(
  contextOrDate: ContextFn<ResultDate> | Date | undefined,
  value: number,
): ResultDate {
  if (typeof contextOrDate === "function") return contextOrDate(value);

  if (contextOrDate instanceof Date) {
    return new (contextOrDate.constructor as new (v: number) => ResultDate)(
      value,
    );
  }

  return new Date(value) as ResultDate;
}
