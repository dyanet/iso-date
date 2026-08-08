/** Is `date` a `Date` instance representing a real, non-Invalid instant? */
export function isValid(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}
