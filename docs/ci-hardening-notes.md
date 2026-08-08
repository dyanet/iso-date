# CI hardening notes

A record of what was checked against `dyanet/imap`'s CI (the structural
template this repo followed) and what was done about it, plus the other
hardening applied at the same time. Written so the reasoning doesn't have
to be re-derived later.

## Issues found in dyanet/imap's CI, and what this repo does instead

1. **Publish runs on every push to main, without a version-bump check.**
   `dyanet/imap`'s `publish` job is gated only on
   `github.ref == 'refs/heads/main' && github.event_name == 'push'`. Since
   `package.json`'s version doesn't change on every commit, most pushes to
   main fail the publish step with "cannot publish over previously
   published version" -- confirmed directly: pulling their Actions run
   history showed 25 failed runs out of the visible history, including
   run #38, whose only failing step was `publish`.

   **Fix here:** `publish` only runs off an explicit `v*` tag
   (`startsWith(github.ref, 'refs/tags/v')`), with an added step that
   verifies the tag matches `package.json`'s version before publishing.
   Main stays green regardless of how many commits land before the next
   release.

2. **Example-app dependency bumps trigger the main package's full CI +
   publish-eligibility run.** Confirmed via `dyanet/imap`'s own open issue
   [#22](https://github.com/dyanet/imap/issues/22), "example code should
   not trigger @dyanet/imap bump action" ("Example code can be passing all
   versions of NodeJS but there is no change to main package. Fix
   detection.") -- still open. Their Actions history bears this out: many
   runs are Dependabot bumps of dependencies inside
   `examples/gmail-viewer` or `examples/gmail-viewer-cdk` (postcss,
   body-parser, aws-cdk-lib, ...), each running the identical workflow a
   real library change would.

   **Fix here:** `ci.yml`'s `push`/`pull_request` triggers use
   `paths-ignore` for `examples/**`, `docs/**`, and `**.md`, so a change
   scoped to the example app or documentation doesn't run the package's
   test/publish pipeline at all.

3. **A separate build path doesn't gate on tests.** `dyanet/imap`'s own
   open issue [#23](https://github.com/dyanet/imap/issues/23), "Include
   tests in builds," asks for unit/property tests to run before a Docker
   build for the example app, since that path currently doesn't run them.

   **This repo doesn't have a Docker build**, so the literal issue doesn't
   apply, but the underlying principle -- nothing gets built/published
   without tests passing first -- does. Confirmed already true here:
   `publish` declares `needs: test`, so a failing or skipped test run
   blocks publish unconditionally. Documented as a code comment in
   `ci.yml` rather than left implicit.

4. **Example lockfile drift.** `dyanet/imap`'s own open issue
   [#21](https://github.com/dyanet/imap/issues/21), "examples/gmail-viewer
   lock file not up to date." Not applicable here: `examples/date-validator-cli`
   ships no `package-lock.json` at all (confirmed by directory listing),
   so there's nothing to drift out of sync.

## Other hardening applied at the same time (not found in dyanet/imap
specifically, just good practice while touching this file)

- **Least-privilege `permissions`.** The `test` job now declares
  `permissions: contents: read` explicitly, rather than relying on
  whatever the repo's default `GITHUB_TOKEN` permissions happen to be.
- **`concurrency` group with `cancel-in-progress: true`**, scoped to
  `${{ github.workflow }}-${{ github.ref }}`, so a newer push cancels a
  still-running older CI run on the same branch/PR instead of both running
  to completion.
- **Action versions bumped to `actions/checkout@v7` /
  `actions/setup-node@v7`** (current latest as of August 2026).
  GitHub Actions is forcing JavaScript actions onto the Node 24 runtime by
  default (started June 2, 2026) and fully removing the Node 20 runtime in
  September 2026 -- older major versions of these actions that still
  target Node 20 internally are close to breaking outright.
- **Node matrix limited to currently-supported LTS lines: 22, 24, 26.**
  Node 18 and 20 are EOL as of August 2026 (endoflife.date /
  nodejs.org release schedule) -- Node 22 is Maintenance LTS, Node 24 is
  Active LTS, Node 26 is Current and becomes Active LTS in October 2026.
  `engines.node` in `package.json` was raised to `>=22.0.0` to match:
  claiming support for EOL Node versions without CI proof isn't actually
  support.
