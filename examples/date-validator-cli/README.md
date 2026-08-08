# date-validator-cli

A minimal example app showing `@dyanet/iso-date` in use. It runs any strings
you give it (or a small built-in demo list) through `isISOMatch`,
`normalizeISO`, `parseISOComponents`, and `parseISOStrict`, and prints what
each one decides.

## Setup

```bash
cd examples/date-validator-cli
npm install
```

This installs `@dyanet/iso-date` from npm. If you're working against a local
unpublished build of the parent package instead, replace the dependency with
a local `file:` link before installing:

```bash
npm install ../.. 
```

(run from inside `examples/date-validator-cli`, after `npm run build` in the
repo root).

## Run

```bash
npm start
```

runs the built-in demo list. Or pass your own strings:

```bash
node validate.mjs "2024-06-15T13:45:00Z" "2024-13-01" "not-a-date"
```

## Commands

| Command                          | What it does                                    |
| --------------------------------- | ------------------------------------------------ |
| `npm start`                       | Validates the built-in demo list                |
| `node validate.mjs <strings...>`  | Validates the strings you pass on the command line |
