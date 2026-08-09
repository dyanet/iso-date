# @dyanet/iso-date

[![CI](https://github.com/dyanet/iso-date/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/iso-date/actions/workflows/ci.yml)
[![Coverage](./.github/badges/coverage.svg)](https://github.com/dyanet/iso-date/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@dyanet/iso-date.svg)](https://www.npmjs.com/package/@dyanet/iso-date)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-%40dyanet%2Fiso--date-2a1f18)](https://github.com/dyanet/iso-date/pkgs/npm/iso-date)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Zero-dependency date utilities for TypeScript and JavaScript: everyday
arithmetic and comparison for the 80% of date handling every application
needs, plus a strict ISO 8601 validation/parsing family for the cases that
need real rigor. Two surfaces, one package, no other date library required.

Most date libraries pick one of two tradeoffs. day.js and (mostly) date-fns
are zero- or near-zero-dependency, but their arithmetic is hand-rolled --
correct as far as their own tests exercise it, but reimplemented rather
than delegated to a spec. Libraries that want `Temporal`-grade correctness
instead typically pull in `@js-temporal/polyfill`, a real and fairly heavy
dependency, which defeats the point if what you wanted was a small package.
And almost none of them treat *validation* as a first-class concern the
way they treat parsing -- `parseISO`, `Date.parse`, and friends are all
deliberately lenient, so "is this string actually ISO 8601" isn't a
question most of them answer well; you're expected to parse first and
inspect the result, which lets a lot of malformed input slip through as
"close enough." `@dyanet/iso-date` doesn't try to out-feature the big
general-purpose libraries (no formatting, no locales, see "What's not in
this package" below) -- what it does differently is: `core`'s arithmetic
is delegated to native `Temporal.PlainDate` when available and to an
internal shim built on the same calendar math otherwise, never hand-rolled
and never a real dependency either way; and `strict` treats ISO 8601
validation as its own dedicated, rigorously tested job rather than a side
effect of parsing.

```typescript
import { addMonths, isBefore } from "@dyanet/iso-date";        // core: everyday functions
import { isISOMatch } from "@dyanet/iso-date/strict";           // strict: ISO 8601 validation
```

**[Try it live →](https://iso-date-demo.dyanet.workers.dev)** — an interactive
demo of both surfaces. It loads this package's own compiled output as plain ES
modules with no bundler and no network calls, so it doubles as a working proof
of the zero-dependency claim; it also reports whether your browser is running
the native `Temporal` path or the internal shim.

## Background

JavaScript's native `Date.parse` and libraries like `date-fns`'s `parseISO`
are deliberately *lenient*: they accept a wide range of ISO-like strings,
silently fill in missing pieces, and fall back to platform-specific
behavior for anything ambiguous. That's the right default for parsing dates
you already trust. It's the wrong default when you're **validating**
untrusted input (an API payload, a CSV import, a form field) and need to
know whether a string is *actually*, strictly, ISO 8601 -- not just
something a permissive parser can make sense of.

`@dyanet/iso-date` started as the `strict` family, which grew out of [an
open date-fns feature request](https://github.com/date-fns/date-fns/issues/2666):
a strict ISO 8601 matcher and parser family, built on the same calendar
math date-fns itself uses (proleptic Gregorian calendar, real leap-year
rules, the ISO week-date system), but shipped as a standalone,
dependency-free package rather than requiring the rest of date-fns.

The top-level `core` namespace extends that same zero-dependency, no-locale
philosophy to the arithmetic and comparison functions applications reach
for constantly -- `addDays`, `isBefore`, and friends -- so most applications
can use this one package instead of installing a second date library for
the common case. See [`docs/temporal-engine-plan.md`](./docs/temporal-engine-plan.md)
for the full design rationale and what's deliberately out of scope for now
(formatting and locales, most notably).

## Features

- **Zero Dependencies** -- no runtime dependencies at all, not even date-fns,
  and not a Temporal polyfill package either (see "How the calendar engine
  works" below).
- **Temporal-backed accuracy** -- `core`'s arithmetic uses native
  `Temporal.PlainDate` when the running engine has it, and an internal,
  dependency-free shim of just the operations needed when it doesn't --
  either way, calendar overflow (month-end clamping, leap years) follows
  the same well-defined "constrain" rule real `Temporal` uses.
- **Strict by design** (the `strict` subpath) -- shape validation *and*
  calendar validity (real Gregorian dates, leap years, ISO week-numbering
  years, ordinal day-of-year), not "close enough."
- **TypeScript First** -- written in TypeScript, ships full `.d.ts`
  declarations for both subpaths.
- **Extended year support** (`strict`) -- years outside `Date`'s
  representable range, and years 0-99 without JavaScript's legacy
  two-digit-year remapping.
- **Small Footprint** -- no formatting engine, no locale files; every
  function does one well-defined thing.

## How the calendar engine works

`core`'s arithmetic functions (`addDays`, `addMonths`, ...) need to handle
calendar overflow correctly -- e.g. Jan 31 plus one month should land on
Feb 28 (or 29), not spill into March. Rather than reimplement that logic a
third time, `core` delegates the calendar-field math to
[`Temporal.PlainDate`](https://tc39.es/proposal-temporal/docs/plaindate.html)
(Stage 4 / ES2026 as of March 2026): natively, when `globalThis.Temporal`
is present (Node >= 26, released May 2026; Chrome 144+; Firefox 139+), or
via a small internal shim -- built on this package's own proleptic
Gregorian calendar math, not a third-party polyfill -- on engines that
don't have it yet. Application code never sees the difference; both paths
are exercised in this package's own test suite.

## Installation

Published to **GitHub Packages** (not npmjs.com). GitHub Packages requires
authentication for every install, including public packages, so consumers
need a `.npmrc` telling npm where the `@dyanet` scope lives:

```
@dyanet:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

where `GITHUB_TOKEN` is a personal access token with the `read:packages`
scope. Then:

```bash
npm install @dyanet/iso-date
```

Inside GitHub Actions the token is already available — set
`registry-url: https://npm.pkg.github.com` and `scope: '@dyanet'` on
`actions/setup-node` and pass `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.

## Quick Start — core (top-level import)

```typescript
import { addDays, addMonths, isBefore, isSameDay, differenceInCalendarDays } from "@dyanet/iso-date";

addDays(new Date(2024, 0, 15), 20);              // Feb 4, 2024 -- time-of-day preserved
addMonths(new Date(2023, 0, 31), 1);             // Feb 28, 2023 -- clamped, not spilled into March
isBefore(new Date(2024, 0, 1), new Date(2024, 5, 1)); // true
isSameDay(new Date(2024, 5, 1, 1), new Date(2024, 5, 1, 23)); // true -- ignores time-of-day
differenceInCalendarDays(new Date(2024, 2, 1), new Date(2024, 1, 1)); // 29 -- Feb 2024 is a leap year
```

## Quick Start — strict (`@dyanet/iso-date/strict`)

```typescript
import { isISOMatch, parseISOStrict, parseISOComponents, normalizeISO } from "@dyanet/iso-date/strict";

isISOMatch("2024-06-15T13:45:00Z");           // true
isISOMatch("2024-06-15T13:45:00Z", { representation: "date" }); // false -- has a time part
isISOMatch("2024-13-01T00:00:00Z");           // false -- month 13 doesn't exist
isISOMatch("20240615T134500Z");               // false -- basic format, extended requested by default

parseISOStrict("2024-06-15T13:45:00Z");       // a real Date
parseISOStrict("not a date");                 // an Invalid Date (isNaN(d.getTime()) === true), never throws

parseISOComponents("2024-06-15T13:45:00Z");
// { year: 2024, month: 6, day: 15, dayOfYear: 167, weekYear: 2024, week: 24,
//   isoDay: 6, hours: 13, minutes: 45, seconds: 0, offsetMinutes: 0, timestamp: ... }

normalizeISO("2024-W24-6", { representation: "date", inputDateRepresentation: "week" }); // "2024-06-15" (week date -> calendar date)
normalizeISO("2024-06-15", { representation: "date", outputDateRepresentation: "ordinal" }); // "2024-167"
```

## Core API Reference

All `core` functions take a plain `Date` and return a plain `Date`, `number`,
or `boolean`. Arithmetic preserves the input's time-of-day untouched.

### Arithmetic

`addDays`, `addWeeks`, `addMonths`, `addYears`, `subDays`, `subWeeks`,
`subMonths`, `subYears` -- each `(date: Date, amount: number): Date`.
Month/year arithmetic clamps at the target month's length rather than
overflowing (Jan 31 + 1 month -> Feb 28/29, matching `Temporal`'s default
"constrain" overflow behavior).

### Comparison

- `isBefore(date, dateToCompare)`, `isAfter(date, dateToCompare)`,
  `isEqual(date, dateToCompare)` -- full-instant comparison (timestamp,
  including time-of-day).
- `compareAsc(dateA, dateB)`, `compareDesc(dateA, dateB)` -- return
  `-1 | 0 | 1`, for use with `Array.prototype.sort`.
- `isSameDay(dateA, dateB)`, `isSameMonth(dateA, dateB)`,
  `isSameYear(dateA, dateB)` -- local calendar-field comparison, ignoring
  time-of-day.

### Difference

`differenceInCalendarDays(dateLeft, dateRight): number` -- whole calendar
days between two local dates, ignoring time-of-day (unlike dividing a raw
millisecond difference by 86400000, which is thrown off by any time-of-day
difference between the two arguments, not just DST).

### Validity

`isValid(date: Date): boolean` -- true for a real `Date` whose `getTime()`
isn't `NaN`.

## Strict ISO 8601 API Reference (`@dyanet/iso-date/strict`)

### `isISOMatch(dateString, options?): boolean`

Returns `true` only when the entire string matches the selected strict ISO
8601 shape and every field is semantically valid (real calendar date, valid
time, valid offset). Never throws.

```typescript
isISOMatch("2019-09-18T19:00:52Z");                          // true
isISOMatch("2019-09-18", { representation: "date" });        // true
isISOMatch("2023-02-30", { representation: "date" });        // false -- not a real date
isISOMatch("50");                                             // false -- not ISO-shaped at all
```

Options (all optional):

| Option                | Type                                     | Default      | Meaning                                  |
| ---------------------- | ----------------------------------------- | ------------- | ----------------------------------------- |
| `representation`       | `"complete" \| "date" \| "time"`          | `"complete"`  | Require date+time, date only, or time only |
| `format`                | `"extended" \| "basic"`                   | `"extended"`  | With separators (`-`, `:`) or without      |
| `dateRepresentation`    | `"calendar" \| "ordinal" \| "week"`       | `"calendar"`  | `YYYY-MM-DD`, `YYYY-DDD`, or `YYYY-Www-D`  |
| `additionalDigits`      | `0 \| 1 \| 2`                              | `2`           | Extra digits allowed for signed expanded years |

### `parseISOStrict(dateString, options?): Date`

Parses to a real `Date`. Returns an **Invalid Date** (`isNaN(result.getTime())`)
rather than throwing when the string isn't strict ISO 8601, or describes an
instant outside `Date`'s representable range -- the same range-clipping rule
the native `Date` constructor itself uses. Takes the same options as
`isISOMatch`, plus:

| Option | Type                        | Default | Meaning                                                        |
| ------ | ---------------------------- | ------- | ---------------------------------------------------------------- |
| `in`   | `(value: number) => ResultDate` | plain `Date` | Context function controlling the returned Date's constructor (for date-fns-style `TZDate`/`UTCDate` interop) |

### `parseISOComponents(dateString, options?): ISOComponents | null`

Parses into individual calendar, ordinal, ISO-week, time, and offset
fields together -- all mutually consistent -- rather than into a single
`Date`. Returns `null` on invalid input. Useful when you need the ISO
week-date or ordinal-day fields directly, or want to work with a parsed
result without going through `Date` at all.

### `normalizeISO(dateString, options?): string`

Reformats a strict ISO 8601 string: converts between basic/extended syntax
and between calendar/ordinal/week-date representations, without changing
the instant described. Preserves how the input spelled its timezone (a
trailing `Z` stays `Z`; a signed zero offset like `-00:00` is kept distinct
from `+00:00`). Throws `RangeError` when the input isn't strict ISO 8601 in
the requested input shape.

## What's not in this package (yet)

**In `strict`:** `parseISOInterval` (ISO 8601 interval strings, e.g.
`2024-01-01/2024-06-30`) and an extended `formatISO` are intentionally left
out: both need date-fns's own calendar-arithmetic functions (`add`/`sub`)
internally, which would pull in a real dependency and break the
zero-dependency goal. If you need interval parsing, do the two
`parseISOStrict` calls yourself.

Fractional seconds (e.g. `13:45:00.123Z`) and leap seconds (`:60`) are also
not accepted by `strict` -- the time grammar is `HH:mm:ss` plus a zone
qualifier only. A string with a fractional-second component will fail
`isISOMatch` and the other functions the same way any other malformed
string does.

**In `core`:** formatting (`format()`-style token strings) and locale
support are deliberately out of v1 -- that's where date-fns's own bulk and
bug surface concentrates (i18n, pluralization, 150+ locale files), and
getting the arithmetic engine right came first. Time-of-day arithmetic
(`addHours`, `addMinutes`, ...) and SQL/Unix-timestamp marshalling helpers
are reasonable, narrower follow-ups; see
[`docs/temporal-engine-plan.md`](./docs/temporal-engine-plan.md) for the
full list of what's deferred and why.

## Examples

See [`examples/date-validator-cli`](./examples/date-validator-cli) for a
runnable CLI that exercises all four functions against a list of date
strings.

| Example                                                     | What it shows                            | Setup                                              |
| -------------------------------------------------------------| ------------------------------------------ | ----------------------------------------------------- |
| [`date-validator-cli`](./examples/date-validator-cli)         | All four functions, complete vs. date-only | `cd examples/date-validator-cli && npm install && npm start` |

## TypeScript Support

Written in TypeScript; ships its own declarations for both subpaths, no
`@types` package needed. `strict` exports: `IsISOMatchOptions`,
`ParseISOStrictOptions`, `ParseISOComponentsOptions`, `ISOComponents`,
`NormalizeISOOptions`, `AdditionalDigits`, `ISODateRepresentation`,
`ISOFormat`, `ISORepresentation`, `ContextFn`.

## Requirements

Node.js >= 22.0.0 -- every currently-supported LTS line as of August 2026
(22 Maintenance LTS, 24 Active LTS, 26 Current/soon-LTS), each tested in
CI (see `.github/workflows/ci.yml`). Node 18 and 20 are EOL and
intentionally not supported. No runtime dependencies.

## License

MIT -- see [LICENSE](./LICENSE).
