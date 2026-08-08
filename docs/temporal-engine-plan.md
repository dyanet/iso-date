# Temporal-backed core namespace — plan

## Where things stand

`@dyanet/iso-date` today is one thing: a strict ISO 8601 matcher/parser/normalizer
family (`isISOMatch`, `parseISOStrict`, `parseISOComponents`, `normalizeISO`),
built on hand-written proleptic Gregorian calendar math (`strictISO.ts`) with
zero runtime dependencies. That family is staying exactly as-is, moving to a
`@dyanet/iso-date/strict` subpath so it reads as the specialized surface it is.

This plan adds a second, top-level surface — the "common/simple" functions
(arithmetic, comparison) most applications actually reach for day to day —
so the package covers the 80% case without forcing anyone to install a
second date library. Formatting and locale support are explicitly **out**
of v1 (see "What's not in v1" below); the accuracy of the calendar engine
is the only thing that matters for this round.

## Why Temporal, and why we also need our own shim

As of August 2026: `Temporal` reached Stage 4 (ES2026) in March 2026.
Node.js ships it enabled by default starting in **Node 26** (May 2026,
LTS from October 2026). Chrome shipped it in Chrome 144 (Jan 2026), Firefox
in Firefox 139 (May 2025). But our package targets `node >= 18`, and
Node 18/20/22/24 do **not** have `Temporal` as a global without an
experimental flag — not production-safe, and not something we can require
of consumers.

So the design is: use *native* `Temporal.PlainDate` when it's present on
`globalThis` (Node 26+, modern browsers) — free correctness, zero code to
maintain. When it isn't present, fall back to a small, internal,
dependency-free implementation of just the slice of `Temporal.PlainDate`
we actually use (`.from`, `.add`, `.subtract`, `.year`/`.month`/`.day`,
static `.compare`). Downstream code calls the same shape either way and
never branches on which one is active. This is *not* a general Temporal
polyfill (that's a real, fairly heavy package — `@js-temporal/polyfill` —
and pulling it in would break the zero-dependency goal); it's the minimum
subset needed for date arithmetic and comparison, built on calendar math
we already have.

## Phases

1. **`civilFromDays`** — the inverse of the existing `daysFromCivil`
   (Howard Hinnant's `civil_from_days`). `strictISO.ts` currently only
   converts calendar date → day-count; arithmetic needs the reverse
   (day-count → calendar date) too. Lives in `strictISO.ts` alongside its
   counterpart, so both the `strict` family and the new engine share one
   tested source of calendar truth.

2. **Shim `PlainDate`** (`src/temporal/shim.ts`) — a minimal class matching
   the real `Temporal.PlainDate`'s shape for the operations we need:
   `.add({years, months, weeks, days})` / `.subtract(...)` with Temporal's
   default "constrain" overflow behavior (Jan 31 + 1 month → Feb 28/29, not
   spilling into March), `.year`/`.month`/`.day`, static `.compare(a, b)`.

3. **Detection layer** (`src/temporal/detect.ts`) — `getPlainDate()`
   returns `globalThis.Temporal?.PlainDate ?? ShimPlainDate`. Exposed as a
   named export so tests can force the shim path even on engines that do
   have native `Temporal`, to prove the two stay behaviorally identical.

4. **Core functions** (`src/core/*.ts`) — public API is plain `Date` in,
   plain `Date` out (matching how `strict` and how date-fns itself reads),
   internally converting to/from `PlainDate` for the calendar-only part of
   the math and preserving the time-of-day untouched, same convention
   date-fns's own `addDays` etc. use. v1 set:
   - Arithmetic: `addDays`, `addWeeks`, `addMonths`, `addYears`, `subDays`,
     `subWeeks`, `subMonths`, `subYears`
   - Comparison: `isBefore`, `isAfter`, `isEqual`, `isSameDay`,
     `isSameMonth`, `isSameYear`, `compareAsc`, `compareDesc`
   - Difference: `differenceInCalendarDays`
   - Validity: `isValid`

5. **Package wiring** — `@dyanet/iso-date` (top-level, unprefixed) exports
   the core namespace; `@dyanet/iso-date/strict` exports the existing ISO
   family unchanged. Update `package.json` `exports` map, `tsconfig`
   (multiple entry points), and README.

6. **Verification** — unit tests for the core functions include the
   classic calendar traps (leap years, Dec 31 → Jan 1 year rollover,
   month-end clamping both directions, negative/subtracting arithmetic),
   run once against whichever `PlainDate` is active and once forced onto
   the shim. CI matrix stays at Node 18/20/22/24 specifically *because*
   none of them have native Temporal — that's what actually exercises the
   shim path in CI; a follow-up can add Node 26 to the matrix once it's
   more widely deployed, to exercise the native path too.

## What's not in v1

- **Formatting** (`format()`, token language) and **locales** — explicitly
  deferred. This is where date-fns's own bulk and bug surface lives
  (i18n, pluralization, 150+ locale files); doing it well is a much bigger
  effort than arithmetic/comparison and isn't where "accuracy" risk
  concentrates for this round.
- **SQL/Unix marshalling helpers** (`toSQLDate`, `fromUnixSeconds`, etc.) —
  a good, narrow follow-up for the ORM/marshalling use case, deferred until
  the core arithmetic engine is solid.
- **Time-of-day arithmetic** (add hours/minutes/seconds) — v1's `PlainDate`
  approach only covers calendar-day-level fields. Sub-day arithmetic is
  simple millisecond math on `Date` directly and doesn't need Temporal, but
  is left out of this first pass to keep scope tight; can be added as
  `addHours`/`addMinutes`/etc. without touching the Temporal layer at all.
