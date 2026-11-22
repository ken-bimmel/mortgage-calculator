# Mortgage Calculator

A fully client-side mortgage calculator that models a loan as a timeline of
events (recast, lump sum, extra regular payments, refinance, payment frequency
changes) and compares the result against the same loan with no events.
Requirements live in [docs/requirements.md](docs/requirements.md).

## Development

1. `npm install`
2. `npm run start` – dev server
3. `npm test` – unit tests (Vitest) for the calculation and timeline logic
4. `npm run lint`

Tests also run in the Husky pre-commit hook; a failing test blocks the commit.

## Project layout

- `src/utilities/loanCalc.ts` – closed-form amortization formulas
- `src/utilities/simulate.ts` – payment-by-payment engine, event effects, per-period results
- `src/utilities/timeline.ts` – event creation, insertion, drag-and-drop moves, date validation
- `src/utilities/calculate.ts` – combines validation, the scenario and the baseline
- `src/utilities/share.ts` – shareable links (base64 JSON in the `s` query parameter)
- `src/components/` – MUI UI (loan form, timeline, add-event ring, event cards, summary)

## Deploying to GitHub Pages

1. Update the `homepage` attribute of _package.json_
2. Update the `base` attribute of _vite.config.ts_ to match the `homepage` attribute
3. `npm run deploy`

![Plan](<Mortgage Calculator App Mock.excalidraw.svg>)
