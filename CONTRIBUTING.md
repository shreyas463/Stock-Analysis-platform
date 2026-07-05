# Contributing to Basis

## Setup

```bash
npm run setup    # npm install + db migrate + seed demo account
npm run dev      # http://localhost:3000  (demo mode — no keys needed)
```

Demo login: `demo@basis.app` / `demo1234`.

## Quality gates (CI enforces all of these)

```bash
npm run lint          # eslint — @typescript-eslint/no-explicit-any is an ERROR
npm run format:check  # prettier
npm run typecheck     # tsc strict + noUncheckedIndexedAccess
npm test              # vitest unit suite
npm run build         # production build must pass
```

## House rules

1. **Money is integer cents; quantity is integer E4.** Use `lib/money.ts` helpers. Floats
   never touch balances.
2. **Never fabricate market data.** Failure paths surface as error/empty states with the
   `SourceBadge` provenance system. If you add a data source, it must set `source`, `asOf`,
   `synthetic`, `stale`.
3. **User scoping.** Every new API route resolves rows through the session user and verifies
   ownership of any client-supplied ID.
4. **Design tokens only.** No raw hex values or generic Tailwind palette colors in
   components — use the semantic tokens (`bg-panel`, `text-ink-muted`, `text-pos`, …) defined
   in `app/globals.css`.
5. **Every data surface** ships loading, empty and error states.
6. **Forecast/analytics claims must be validated.** Anything predictive needs a baseline
   comparison and honest limitations, following `lib/services/forecast.ts`.
7. Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the migration.

## Pull requests

Branch from `main`, keep PRs focused, include tests for engine-level changes, and make sure
`npm run build` passes locally before requesting review.
