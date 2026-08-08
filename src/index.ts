/**
 * `@dyanet/iso-date`'s top-level, unprefixed export: the `core` namespace
 * -- arithmetic, comparison, and validity functions for everyday date
 * handling (matching how often applications actually reach for each one).
 *
 * The strict ISO 8601 matcher/parser/normalizer family lives at the
 * `@dyanet/iso-date/strict` subpath instead, since it's the more
 * specialized surface of the two.
 */

export * from "./core/index.js";
