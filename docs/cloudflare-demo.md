# The Cloudflare demo site

Live at **https://iso-date-demo.dyanet.workers.dev**, deployed from
`site/` + `wrangler.jsonc`. A record of what was chosen and why, so the
reasoning doesn't have to be re-derived.

## Why Workers with static assets, not Pages

Checked against current Cloudflare docs rather than assumed, because this
product surface has been moving:

- Cloudflare publishes a one-way [Migrate from Pages to
  Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
  guide (last updated July 2026). There is no guide in the other
  direction.
- Workers Sites — the *older* static-hosting mechanism — is deprecated,
  and its deprecation notice points at Workers Assets or Pages, not at
  Pages alone.
- The docs' stated position is that Workers has "a distinctly broader set
  of features" than Pages, with static asset requests billed the same way
  on both.

So Pages still works, but starting a new project there means starting on
the side of a migration Cloudflare is actively steering people away from.
Workers with static assets is where new static sites are pointed today.

Since this site is assets-only, `wrangler.jsonc` has no `main` field:
there is no Worker script, requests are served straight from the asset
store, and there is no per-request compute billing.

## Why no bundler

`scripts/build-site.mjs` copies `dist/` to `site-dist/lib/` and copies
`site/index.html` alongside it. That's the whole build.

The package compiles to plain ESM with relative `./foo.js` specifiers,
which browsers resolve natively. The demo therefore imports *the same
bytes npm consumers get*, unmodified. Running it through a bundler would
undercut the one claim the page exists to demonstrate — that this library
works in a browser with nothing else present. The 16 modules load as 16
requests, which is fine over HTTP/2 and is the point.

## Why deploy on every push to main

The `deploy-demo` job in `.github/workflows/ci.yml` runs on every push to
`main` (gated behind `needs: test`). That looks like the anti-pattern
[`ci-hardening-notes.md`](./ci-hardening-notes.md) criticises for
`publish`, but the two differ where it matters:

- Re-uploading static assets under an existing Worker name **replaces**
  them. Idempotent, always succeeds.
- Re-publishing an already-published npm version is **rejected** by the
  registry. That's what turned most of `dyanet/imap`'s pushes to main red.

The site should track `main`; a release should not. Tag-gating the deploy
would only make the demo stale.

## Required repository secrets

| Secret | Used by | Notes |
| ------- | -------- | ------ |
| `CLOUDFLARE_API_TOKEN` | `deploy-demo` | Scoped token with the **Edit Cloudflare Workers** template. Not the account-global API key. |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-demo` | Not secret in the cryptographic sense; kept as a secret to keep it out of a repo that will be public. |

Without them the job still runs and still builds the site (so the build
itself stays covered), then **skips the deploy step with a notice** rather
than failing. A missing secret shouldn't turn `main` red — training people
to ignore a red `main` is precisely the habit that made
`dyanet/imap`'s CI history hard to read.

## Redeploying by hand

```bash
npm run build:site && npx wrangler deploy
```

`npm run build:site` runs `tsc` first, so it can't deploy a stale library.
