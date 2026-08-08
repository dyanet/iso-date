#!/usr/bin/env node
// Example: a small CLI that runs strings through the @dyanet/iso-date
// family - isISOMatch, parseISOStrict, parseISOComponents, and
// normalizeISO - and prints what each one decides. Useful as a quick
// "is this string really ISO 8601?" gut check, and as a tour of the four
// functions together.
//
// isISOMatch's default `representation` is "complete" (date + time), so a
// bare date string like "2024-06-15" won't match unless you tell it you
// only want a date. Run with no arguments to see both cases demonstrated.

import {
  isISOMatch,
  parseISOStrict,
  parseISOComponents,
  normalizeISO,
} from "@dyanet/iso-date/strict";

function reportComplete(candidate) {
  const matches = isISOMatch(candidate);
  let detail;

  if (matches) {
    const normalized = normalizeISO(candidate);
    const components = parseISOComponents(candidate);
    const parsed = parseISOStrict(candidate);
    const valid = parsed instanceof Date && !Number.isNaN(parsed.getTime());
    detail = `${normalized}  (year ${components?.year}, offset ${
      components?.offsetMinutes ?? "n/a"
    }min, ${valid ? "valid Date" : "out of representable range"})`;
  } else {
    detail = "not a strict ISO 8601 date+time string";
  }

  console.log(`${candidate.padEnd(34)} ${String(matches).padEnd(7)} ${detail}`);
}

const demo = [
  "2024-06-15T13:45:00Z",
  "2024-06-15T13:45:00+05:30",
  "2024-06-15T13:45:00.123Z", // invalid: fractional seconds aren't accepted
  "2023-12-31T23:59:60Z", // invalid: no leap second 60
  "2024-13-01T00:00:00Z", // invalid: month 13
  "not-a-date",
];

const inputs = process.argv.slice(2);
const candidates = inputs.length > 0 ? inputs : demo;

console.log("date + time strings (default `representation: \"complete\"`)");
console.log("string                             match   normalized / error");
console.log("-".repeat(78));
for (const candidate of candidates) reportComplete(candidate);

if (inputs.length === 0) {
  console.log();
  console.log('date-only strings (pass `{ representation: "date" }`)');
  console.log("-".repeat(78));
  for (const candidate of ["2024-06-15", "0000-01-01", "2024-02-30"]) {
    const opts = { representation: "date" };
    const matches = isISOMatch(candidate, opts);
    const detail = matches
      ? normalizeISO(candidate, opts)
      : "not a strict ISO 8601 date-only string";
    console.log(`${candidate.padEnd(34)} ${String(matches).padEnd(7)} ${detail}`);
  }
}
