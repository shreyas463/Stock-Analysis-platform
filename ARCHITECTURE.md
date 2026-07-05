# Basis — Architecture

## System shape

Basis is deliberately a **single TypeScript process**: a Next.js 15 App Router application
whose route handlers are the API and whose server modules are the domain layer, backed by
SQLite through Drizzle ORM.

```
app/
├── (public)/welcome        # marketing/landing page (logged-out)
├── (auth)/login,register   # session auth pages
├── (app)/…                 # authenticated product pages (server components)
└── api/…                   # JSON route handlers (zod-validated, user-scoped)
components/
├── ui/                     # design-system primitives (Radix + Tailwind tokens)
├── shell/                  # sidebar, topbar, command palette
└── <feature>/              # feature client components
lib/
├── db/                     # Drizzle schema + SQLite client (WAL, FK on)
├── auth/                   # scrypt password hashing + opaque-token sessions
├── market-data/            # provider abstraction (Finnhub / Stooq / synthetic)
├── analytics/              # pure indicator & statistics functions
└── services/               # trading, portfolio, alerts, forecast
drizzle/                    # generated SQL migrations
scripts/                    # migrate + seed (demo account)
tests/                      # vitest unit tests for the correctness core
```

### Why not FastAPI + Postgres + Redis?

The legacy backend was a 1,500-line Flask file. The rebuild evaluated a Python/Postgres split
and rejected it deliberately:

- **One language end-to-end** removes an entire class of drift (two type systems, two
  validation layers, duplicated portfolio math — all bugs the legacy app actually had).
- **SQLite in WAL mode** is more than sufficient for a single-node paper-trading workload,
  gives real ACID transactions (which the legacy Firestore code lacked), and makes local
  setup one command. Drizzle keeps the schema portable; swapping in Postgres is a driver
  change, not a rewrite.
- **No Redis/queues**: alerts and order sweeps are evaluated deterministically on request.
  A paper platform gains nothing from background workers except operational surface.
- **Auth consolidation**: Firebase auth (plus its mock-auth fallback that accepted any token
  in dev) is replaced by boring, auditable session auth — scrypt password hashes, opaque
  tokens stored as SHA-256 hashes, httpOnly/SameSite cookies.

The modularity requirement is met by the `lib/services` + `lib/market-data` layering, not by
network boundaries.

## The money model

- **Money = integer cents.** No floats touch a balance (`lib/money.ts`).
- **Quantity = integer E4** (shares × 10,000) → fractional shares to 4 dp.
- Every mutation of cash or positions happens inside a single `db.transaction` that also
  writes the order, trade and cash-ledger rows. The ledger stores `balanceAfterCents` so any
  drift is detectable by replay.
- Orders carry per-portfolio **idempotency keys** (unique index) — a double-submitted ticket
  returns the original order instead of double-buying.
- Fills: market orders execute at quote ± 5 bps slippage (against the trader); limit/stop
  orders rest as `open` and are matched by `sweepOpenOrders` when the portfolio is viewed;
  limit fills never exceed the limit price. Market-closed fills use the last available price
  and the order is annotated.

## Market data

`lib/market-data` is the only module allowed to talk to providers; keys never reach the
client. Three providers implement one interface:

| Provider  | Role                                              | Notes                                                                      |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Finnhub   | live quotes, search, profiles, fundamentals, news | optional key; token-bucket rate limiting, timeouts, retries                |
| Stooq     | daily OHLCV history                               | free CSV, cached in the SQLite `candles` table, refreshed ≤ every 12h      |
| Synthetic | demo mode + tests                                 | seeded geometric Brownian walk per symbol — deterministic on every machine |

**The honesty contract:** every payload carries `source`, `asOf`, and `synthetic`/`stale`
flags, and the UI renders them (`SourceBadge`). Failure paths degrade explicitly: live quote
fails → latest cached close marked _stale_; no cache → error state. Nothing is ever invented,
and demo mode returns **no news at all** rather than fake headlines.

## Forecast Lab methodology

The legacy ARIMA service was the worst part of the old app (random confidence, hardcoded
"good buy", post-hoc adjustment with future prices). The replacement (`lib/services/forecast.ts`):

1. **Models.** Baselines: naive last-close, random-walk-with-drift, SMA-20. Candidates:
   AR(p) on log returns (OLS, p ≤ 5 by AIC — the ARIMA(p,1,0) family) and damped Holt
   exponential smoothing (grid-searched α/β/φ).
2. **No look-ahead.** Hyper-parameters are selected only on data _before_ the validation
   period; each validation forecast is fit only on data before its origin.
3. **Walk-forward validation.** Up to 40 rolling origins; every model forecasts h ∈ {5,10,21}
   trading days ahead and is scored by MAPE/MAE against the actual outcome.
4. **Baseline gating.** A candidate is surfaced only if it beats the best baseline by ≥3%
   relative MAPE. Otherwise the response says so explicitly (`beatsBaseline: false`) and the
   UI presents the band as a volatility range, not a prediction.
5. **Empirical intervals.** The band is the 10th–90th percentile of the chosen model's own
   out-of-sample errors, scaled by √(step/h) — historical coverage, not a guarantee.
6. **Full disclosure.** The API returns the whole tournament table, the selection reason in
   plain English, train range, window count, and a limitations list the UI must render.

This is tested: on a seeded random walk the engine must _refuse_ to claim skill
(`tests/forecast.test.ts`), and on a strongly autocorrelated series it must find it.

## Alerts

Deterministic rules (price above/below, %-move, RSI, volume spike, 50/200 MA cross,
drawdown-from-52w-high) evaluated when the user loads the app, with a ~20h re-trigger
cooldown, writing to an in-app `notifications` table. No external delivery, no workers, no
missed-state bugs. Data failure → no alert (never a false trigger).

## The audit that motivated the rebuild

Recorded before any code was written (backend `app.py` 1,495 lines, `ml_service.py` 1,013
lines, `TradingPanel.tsx` 2,286 lines):

- Hardcoded CoinMarketCap keys in `backend/app.py:221` **and**
  `frontend/src/app/api/crypto-prices/route.ts:6`; hardcoded Finnhub fallback key.
- Mock Firestore + mock auth silently substituted on init failure — production requests
  could hit an in-memory fake DB with a hardcoded user.
- `random`-generated "top gainers", news, historical candles and search results returned on
  any upstream failure, presented as real data.
- ML service: `random.uniform(-5, 5)` added to confidence; `is_good_buy: True` hardcoded on
  insufficient data; forecasts rescaled post-hoc by the current real-time price (look-ahead);
  every failure path returned `success: True`.
- Trading: float money math; balance and portfolio updated in separate non-atomic writes;
  no idempotency; sell path could record a transaction even if the balance update failed.
- Frontend: whole product rendered by one page component; 6+ overlapping polling loops
  (3–60s); portfolio "Investing chart" was 100% client-side synthetic data with no backend.
- `next build` failed (Firebase initialized at module load with placeholder keys).

Everything on that list has a structural countermeasure in the new design, described above.
